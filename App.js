import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const STORAGE_KEY = "@ascensao_v01_state";
const DAILY_TARGET_XP = 30;

const WEEK_DAYS = [
  { value: 0, short: "DOM", label: "Domingo" },
  { value: 1, short: "SEG", label: "Segunda" },
  { value: 2, short: "TER", label: "Terça" },
  { value: 3, short: "QUA", label: "Quarta" },
  { value: 4, short: "QUI", label: "Quinta" },
  { value: 5, short: "SEX", label: "Sexta" },
  { value: 6, short: "SÁB", label: "Sábado" },
];

const ALL_WEEK_DAYS = WEEK_DAYS.map((d) => d.value);

const DIFFICULTIES = {
  muito_simples: { label: "Muito simples", xp: 5 },
  simples: { label: "Simples", xp: 10 },
  moderada: { label: "Moderada", xp: 15 },
  dificil: { label: "Difícil", xp: 20 },
  grande: { label: "Grande", xp: 30 },
};

const initialState = {
  player: {
    name: "Neroth",
    level: 1,
    xp: 0,
  },
  tasks: [],
  history: [],
  streak: {
    current: 0,
    best: 0,
    lastCompletedDate: null,
    completedDates: [],
  },
};

function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getPreviousDateKey(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getLastSevenDays(today) {
  const result = [];
  const date = new Date(`${today}T12:00:00`);

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(date);
    d.setDate(date.getDate() - i);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  return result;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function calculateLevel(xp) {
  let level = 1;
  let remaining = Math.max(0, xp);

  while (remaining >= level * 100) {
    remaining -= level * 100;
    level += 1;
  }

  return {
    level,
    currentXP: remaining,
    requiredXP: level * 100,
  };
}

function normalizeTask(task) {
  const type = task.type || "daily";
  const days =
    Array.isArray(task.daysOfWeek) && task.daysOfWeek.length
      ? task.daysOfWeek
      : ALL_WEEK_DAYS;

  return {
    ...task,
    type,
    daysOfWeek: days,
    completed: Boolean(task.completed),
    completedAt: task.completedAt || null,
    awardedXP:
      typeof task.awardedXP === "number"
        ? task.awardedXP
        : task.completed
        ? task.xp || 0
        : 0,
  };
}

function refreshTasksForDate(tasks, today) {
  return tasks
    .map(normalizeTask)
    .filter((task) => {
      if (task.type === "special") {
        if (task.completed && task.completedAt !== today) return false;
        return true;
      }
      return true;
    })
    .map((task) => {
      if (task.type !== "daily") return task;

      if (task.date !== today) {
        return {
          ...task,
          date: today,
          completed: false,
          completedAt: null,
          awardedXP: 0,
        };
      }

      return task;
    });
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && item.date)
    .map((item) => ({
      date: item.date,
      completedXP: Number(item.completedXP) || 0,
      completed: Boolean(item.completed),
      tasks: Array.isArray(item.tasks) ? item.tasks : [],
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function normalizeStreak(streak) {
  const source = streak || {};
  return {
    current: Number(source.current) || 0,
    best: Number(source.best) || 0,
    lastCompletedDate: source.lastCompletedDate || null,
    completedDates: Array.isArray(source.completedDates)
      ? source.completedDates
      : [],
  };
}

function getVisibleTasks(tasks, today) {
  const weekday = new Date(`${today}T12:00:00`).getDay();

  return tasks.filter((task) => {
    if (task.type === "special") return true;
    return task.date === today && task.daysOfWeek.includes(weekday);
  });
}

function makeHistoryEntry(tasks, date) {
  const completedTasks = tasks
    .filter(
      (task) =>
        task.completed &&
        (task.type === "special"
          ? task.completedAt === date
          : task.date === date)
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      xp:
        typeof task.awardedXP === "number"
          ? task.awardedXP
          : task.xp || 0,
      type: task.type,
    }));

  const completedXP = completedTasks.reduce((sum, task) => sum + task.xp, 0);

  return {
    date,
    completedXP,
    completed: completedXP >= DAILY_TARGET_XP,
    tasks: completedTasks,
  };
}

function formatDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function App() {
  const [state, setState] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState(getTodayKey());

  const [screen, setScreen] = useState("today");
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("daily");
  const [difficulty, setDifficulty] = useState("simples");
  const [selectedDays, setSelectedDays] = useState(ALL_WEEK_DAYS);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentDay = getTodayKey();
      if (currentDay !== today) setToday(currentDay);
    }, 30000);

    return () => clearInterval(timer);
  }, [today]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded) return;

    setState((current) => {
      const previousDay = getPreviousDateKey(today);
      const previousEntry = current.history.find(
        (entry) => entry.date === previousDay
      );

      const currentTasks = refreshTasksForDate(current.tasks, today);

      let history = [...current.history];

      if (previousEntry) {
        history = history.filter((entry) => entry.date !== previousDay);
      }

      const previousTasks = current.tasks.filter(
        (task) =>
          task.date === previousDay ||
          (task.type === "special" && task.completedAt === previousDay)
      );

      if (previousTasks.length > 0) {
        const entry = makeHistoryEntry(previousTasks, previousDay);
        history.unshift(entry);
      }

      history = normalizeHistory(history).slice(0, 365);

      return {
        ...current,
        tasks: currentTasks,
        history,
      };
    });
  }, [today, loaded]);

  async function loadState() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setLoaded(true);
        return;
      }

      const parsed = JSON.parse(saved);
      const currentDay = getTodayKey();

      setState({
        ...initialState,
        ...parsed,
        player: {
          ...initialState.player,
          ...(parsed.player || {}),
        },
        tasks: refreshTasksForDate(parsed.tasks || [], currentDay),
        history: normalizeHistory(parsed.history),
        streak: normalizeStreak(parsed.streak),
      });
    } catch (error) {
      console.log("Erro ao carregar Ascensão:", error);
    } finally {
      setLoaded(true);
    }
  }

  const todayTasks = useMemo(
    () => getVisibleTasks(state.tasks, today),
    [state.tasks, today]
  );

  const completedXP = useMemo(
    () =>
      todayTasks
        .filter((task) => task.completed)
        .reduce(
          (sum, task) =>
            sum +
            (typeof task.awardedXP === "number" ? task.awardedXP : task.xp || 0),
          0
        ),
    [todayTasks]
  );

  const levelInfo = calculateLevel(state.player.xp);
  const dailyProgress = Math.min(completedXP / DAILY_TARGET_XP, 1);
  const streak = normalizeStreak(state.streak);

  function syncTodayHistory(nextTasks) {
    const entry = makeHistoryEntry(nextTasks, today);

    setState((current) => ({
      ...current,
      history: normalizeHistory([
        ...current.history.filter((item) => item.date !== today),
        entry,
      ]).slice(0, 365),
    }));
  }

  function toggleTask(task) {
    setState((current) => {
      const target = current.tasks.find((item) => item.id === task.id);
      if (!target) return current;

      const completing = !target.completed;
      const reward = completing ? target.xp || 0 : target.awardedXP || target.xp || 0;

      const tasks = current.tasks.map((item) => {
        if (item.id !== task.id) return item;

        return {
          ...item,
          completed: completing,
          completedAt: completing ? today : null,
          awardedXP: completing ? reward : 0,
        };
      });

      const playerXP = Math.max(
        0,
        current.player.xp + (completing ? reward : -reward)
      );

      const entry = makeHistoryEntry(tasks, today);
      const completedToday = entry.completed;

      let nextStreak = normalizeStreak(current.streak);
      const dates = [...nextStreak.completedDates];

      if (completedToday && !dates.includes(today)) {
        dates.push(today);
        const previousDay = getPreviousDateKey(today);
        const continues =
          nextStreak.lastCompletedDate === previousDay ||
          dates.includes(previousDay);

        nextStreak = {
          ...nextStreak,
          current: continues ? nextStreak.current + 1 : 1,
          best: Math.max(
            nextStreak.best,
            continues ? nextStreak.current + 1 : 1
          ),
          lastCompletedDate: today,
          completedDates: dates,
        };
      }

      if (!completedToday && dates.includes(today)) {
        const index = dates.indexOf(today);
        dates.splice(index, 1);

        nextStreak = {
          ...nextStreak,
          completedDates: dates,
          current:
            nextStreak.lastCompletedDate === today
              ? Math.max(0, nextStreak.current - 1)
              : nextStreak.current,
          lastCompletedDate:
            nextStreak.lastCompletedDate === today
              ? dates.length
                ? dates[dates.length - 1]
                : null
              : nextStreak.lastCompletedDate,
        };
      }

      return {
        ...current,
        player: {
          ...current.player,
          xp: playerXP,
        },
        tasks,
        history: normalizeHistory([
          ...current.history.filter((item) => item.date !== today),
          entry,
        ]),
        streak: nextStreak,
      };
    });
  }

  function openCreateTask() {
    setEditingTask(null);
    setTaskTitle("");
    setTaskType("daily");
    setDifficulty("simples");
    setSelectedDays(ALL_WEEK_DAYS);
    setTaskModalVisible(true);
  }

  function openEditTask(task) {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskType(task.type);
    setDifficulty(task.difficulty || "simples");
    setSelectedDays(task.daysOfWeek || ALL_WEEK_DAYS);
    setTaskModalVisible(true);
  }

  function closeTaskModal() {
    setTaskModalVisible(false);
    setEditingTask(null);
    setTaskTitle("");
  }

  function saveTask() {
    const title = taskTitle.trim();

    if (!title) {
      Alert.alert("Task sem nome", "Digite um nome para a task.");
      return;
    }

    const reward = DIFFICULTIES[difficulty];

    if (editingTask) {
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title,
                type: taskType,
                difficulty,
                xp: reward.xp,
                daysOfWeek:
                  taskType === "daily" ? selectedDays : ALL_WEEK_DAYS,
              }
            : task
        ),
      }));
    } else {
      const newTask = {
        id: createId(),
        title,
        type: taskType,
        difficulty,
        xp: reward.xp,
        daysOfWeek:
          taskType === "daily" ? selectedDays : ALL_WEEK_DAYS,
        date: today,
        completed: false,
        completedAt: null,
        awardedXP: 0,
        createdAt: new Date().toISOString(),
      };

      setState((current) => ({
        ...current,
        tasks: [newTask, ...current.tasks],
      }));
    }

    closeTaskModal();
  }

  function deleteTask(task) {
    Alert.alert("Excluir task", `Deseja excluir "${task.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          setState((current) => {
            const awarded = task.completed ? task.awardedXP || task.xp || 0 : 0;

            return {
              ...current,
              player: {
                ...current.player,
                xp: Math.max(0, current.player.xp - awarded),
              },
              tasks: current.tasks.filter((item) => item.id !== task.id),
            };
          });
        },
      },
    ]);
  }

  function toggleDay(day) {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  }

  function renderTask(task) {
    return (
      <View key={task.id} style={styles.taskCard}>
        <Pressable
          onPress={() => toggleTask(task)}
          style={[
            styles.taskCheck,
            task.completed && styles.taskCheckCompleted,
          ]}
        >
          {task.completed && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </Pressable>

        <Pressable style={styles.taskContent} onPress={() => toggleTask(task)}>
          <Text
            style={[
              styles.taskTitle,
              task.completed && styles.taskTitleCompleted,
            ]}
          >
            {task.title}
          </Text>

          <View style={styles.taskMeta}>
            <Text style={styles.taskDifficulty}>
              {DIFFICULTIES[task.difficulty]?.label || "Task"}
            </Text>
            <Text style={styles.taskXP}>+{task.xp} XP</Text>
            {task.type === "special" && (
              <Text style={styles.specialText}> ESPECIAL</Text>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => openEditTask(task)}
          style={styles.smallAction}
        >
          <Ionicons name="pencil-outline" size={17} color="#777383" />
        </Pressable>

        <Pressable
          onPress={() => deleteTask(task)}
          style={styles.smallAction}
        >
          <Ionicons name="trash-outline" size={17} color="#777383" />
        </Pressable>
      </View>
    );
  }

  function renderTaskModal() {
    return (
      <Modal
        visible={taskModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeTaskModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? "Editar task" : "Nova task"}
              </Text>

              <Pressable onPress={closeTaskModal} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#AAA5B7" />
              </Pressable>
            </View>

            <TextInput
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="Nome da task"
              placeholderTextColor="#625D70"
              style={styles.input}
            />

            <Text style={styles.modalLabel}>TIPO</Text>
            <View style={styles.optionRow}>
              <OptionButton
                label="Diária"
                active={taskType === "daily"}
                onPress={() => setTaskType("daily")}
              />
              <OptionButton
                label="Especial"
                active={taskType === "special"}
                onPress={() => setTaskType("special")}
              />
            </View>

            <Text style={styles.modalLabel}>DIFICULDADE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.optionRow}>
                {Object.entries(DIFFICULTIES).map(([key, item]) => (
                  <OptionButton
                    key={key}
                    label={`${item.label} · ${item.xp} XP`}
                    active={difficulty === key}
                    onPress={() => setDifficulty(key)}
                  />
                ))}
              </View>
            </ScrollView>

            {taskType === "daily" && (
              <>
                <Text style={styles.modalLabel}>DIAS</Text>
                <View style={styles.daysRow}>
                  {WEEK_DAYS.map((day) => (
                    <Pressable
                      key={day.value}
                      onPress={() => toggleDay(day.value)}
                      style={[
                        styles.dayButton,
                        selectedDays.includes(day.value) &&
                          styles.dayButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          selectedDays.includes(day.value) &&
                            styles.dayTextActive,
                        ]}
                      >
                        {day.short}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeTaskModal}
                style={[styles.modalButton, styles.secondaryButton]}
              >
                <Text style={styles.secondaryButtonText}>CANCELAR</Text>
              </Pressable>

              <Pressable
                onPress={saveTask}
                style={[styles.modalButton, styles.primaryButton]}
              >
                <LinearGradient
                  colors={["#6548F5", "#8B63FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.primaryButtonText}>SALVAR</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingTitle}>ASCENSÃO</Text>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#070811" />

      {screen === "today" && (
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerEyebrow}>ASCENSÃO</Text>
              <Text style={styles.headerTitle}>Hoje</Text>
            </View>

            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>NÍVEL {levelInfo.level}</Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <View>
                <Text style={styles.progressLabel}>PROGRESSO DIÁRIO</Text>
                <Text style={styles.progressValue}>
                  {completedXP} / {DAILY_TARGET_XP} XP
                </Text>
              </View>

              <Text style={styles.progressPercent}>
                {Math.round(dailyProgress * 100)}%
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${dailyProgress * 100}%` },
                ]}
              />
            </View>

            <Text style={styles.progressHint}>
              {completedXP >= DAILY_TARGET_XP
                ? "Meta de hoje concluída."
                : `Faltam ${Math.max(
                    0,
                    DAILY_TARGET_XP - completedXP
                  )} XP para concluir.`}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>MISSÕES</Text>
              <Text style={styles.sectionTitle}>Tarefas de hoje</Text>
            </View>

            <Pressable onPress={openCreateTask} style={styles.addButton}>
              <Ionicons name="add" size={23} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.taskList}
          >
            {todayTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="sparkles-outline"
                  size={32}
                  color="#6E6684"
                />
                <Text style={styles.emptyTitle}>
                  Nenhuma tarefa por aqui
                </Text>
                <Text style={styles.emptyText}>
                  Crie uma missão para começar sua ascensão.
                </Text>
                <Pressable
                  onPress={openCreateTask}
                  style={styles.emptyButton}
                >
                  <Text style={styles.emptyButtonText}>CRIAR TAREFA</Text>
                </Pressable>
              </View>
            ) : (
              todayTasks.map(renderTask)
            )}

            <View style={{ height: 110 }} />
          </ScrollView>
        </View>
      )}

      {screen === "streak" && (
        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pageContent}
          >
            <Text style={styles.headerEyebrow}>PROGRESSO</Text>
            <Text style={styles.pageTitle}>Streak</Text>

            <View style={styles.streakHero}>
              <Ionicons name="flame" size={28} color="#A987FF" />
              <Text style={styles.streakNumber}>{streak.current}</Text>
              <Text style={styles.streakLabel}>DIAS DE SEQUÊNCIA</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{streak.best}</Text>
                <Text style={styles.statLabel}>MELHOR STREAK</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {streak.completedDates.length}
                </Text>
                <Text style={styles.statLabel}>DIAS CONCLUÍDOS</Text>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>ÚLTIMOS 7 DIAS</Text>

              <View style={styles.weekRow}>
                {getLastSevenDays(today).map((date) => {
                  const completed = streak.completedDates.includes(date);
                  const dateObj = new Date(`${date}T12:00:00`);
                  const label = dateObj
                    .toLocaleDateString("pt-BR", { weekday: "short" })
                    .replace(".", "")
                    .slice(0, 3)
                    .toUpperCase();

                  return (
                    <View key={date} style={styles.weekDay}>
                      <View
                        style={[
                          styles.dayCircle,
                          completed && styles.dayCircleComplete,
                        ]}
                      >
                        {completed && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                      <Text style={styles.weekDayLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>COMO FUNCIONA</Text>
              <Text style={styles.ruleText}>
                Complete a meta diária de {DAILY_TARGET_XP} XP para registrar o
                dia como concluído.
              </Text>
              <Text style={styles.ruleText}>
                Dias concluídos aumentam sua sequência. Um dia sem a meta
                concluída interrompe a sequência.
              </Text>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      )}

      {screen === "history" && (
        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pageContent}
          >
            <Text style={styles.headerEyebrow}>REGISTRO</Text>
            <Text style={styles.pageTitle}>Histórico</Text>

            {state.history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="time-outline"
                  size={32}
                  color="#6E6684"
                />
                <Text style={styles.emptyTitle}>Ainda não há histórico</Text>
                <Text style={styles.emptyText}>
                  Conforme você concluir seus dias, eles aparecerão aqui.
                </Text>
              </View>
            ) : (
              state.history.map((entry) => (
                <View key={entry.date} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>
                        {formatDate(entry.date)}
                      </Text>
                      <Text style={styles.historyXP}>
                        {entry.completedXP} XP concluídos
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.historyStatus,
                        entry.completed && styles.historyStatusComplete,
                      ]}
                    >
                      <Ionicons
                        name={entry.completed ? "checkmark" : "remove"}
                        size={16}
                        color={entry.completed ? "#91D6AA" : "#8A8495"}
                      />
                    </View>
                  </View>

                  {entry.tasks.length === 0 ? (
                    <Text style={styles.noTasksText}>
                      Nenhuma task concluída.
                    </Text>
                  ) : (
                    entry.tasks.map((task) => (
                      <View key={`${entry.date}-${task.id}`} style={styles.historyTask}>
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color="#8062F2"
                        />
                        <Text style={styles.historyTaskTitle}>
                          {task.title}
                        </Text>
                        <Text style={styles.historyTaskXP}>+{task.xp}</Text>
                      </View>
                    ))
                  )}
                </View>
              ))
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      )}

      <View style={styles.bottomNav}>
        <NavItem
          icon="today-outline"
          label="Hoje"
          active={screen === "today"}
          onPress={() => setScreen("today")}
        />
        <NavItem
          icon="flame-outline"
          label="Streak"
          active={screen === "streak"}
          onPress={() => setScreen("streak")}
        />
        <NavItem
          icon="time-outline"
          label="Histórico"
          active={screen === "history"}
          onPress={() => setScreen("history")}
        />
      </View>

      {renderTaskModal()}
    </SafeAreaView>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <Ionicons
        name={icon}
        size={22}
        color={active ? "#9876FF" : "#656273"}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function OptionButton({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.optionButton, active && styles.optionButtonActive]}
    >
      <Text
        style={[
          styles.optionButtonText,
          active && styles.optionButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070811",
  },
  container: {
    flex: 1,
    backgroundColor: "#070811",
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#070811",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    color: "#A47CFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
  },
  loadingText: {
    color: "#777487",
    marginTop: 10,
    fontSize: 13,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerEyebrow: {
    color: "#7168A0",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  headerTitle: {
    color: "#F2EFF8",
    fontSize: 27,
    fontWeight: "700",
    marginTop: 3,
  },
  levelBadge: {
    backgroundColor: "#11121D",
    borderWidth: 1,
    borderColor: "#29263C",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  levelBadgeText: {
    color: "#A68AFF",
    fontSize: 9,
    fontWeight: "800",
  },
  progressCard: {
    marginHorizontal: 18,
    backgroundColor: "#10111A",
    borderWidth: 1,
    borderColor: "#202131",
    borderRadius: 18,
    padding: 17,
    marginBottom: 24,
  },
  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  progressLabel: {
    color: "#7168A0",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  progressValue: {
    color: "#F2EFF8",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 3,
  },
  progressPercent: {
    color: "#A98BFF",
    fontSize: 17,
    fontWeight: "800",
  },
  progressBar: {
    height: 8,
    borderRadius: 10,
    backgroundColor: "#242332",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#7657E8",
  },
  progressHint: {
    color: "#6F6C7B",
    fontSize: 10,
    marginTop: 9,
  },
  sectionHeader: {
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: "#7168A0",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  sectionTitle: {
    color: "#F2EFF8",
    fontSize: 23,
    fontWeight: "700",
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#6549D9",
    alignItems: "center",
    justifyContent: "center",
  },
  taskList: {
    paddingHorizontal: 18,
    gap: 8,
  },
  taskCard: {
    minHeight: 73,
    backgroundColor: "#10111A",
    borderWidth: 1,
    borderColor: "#202131",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  taskCheck: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#4D4960",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  taskCheckCompleted: {
    backgroundColor: "#684BE0",
    borderColor: "#8466F3",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    color: "#E8E5EF",
    fontSize: 14,
    fontWeight: "600",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#85818E",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  taskDifficulty: {
    color: "#686578",
    fontSize: 9,
    marginRight: 9,
  },
  taskXP: {
    color: "#9D83FF",
    fontSize: 10,
    fontWeight: "700",
  },
  specialText: {
    color: "#D87591",
    fontSize: 8,
    fontWeight: "800",
    marginLeft: 7,
  },
  smallAction: {
    padding: 6,
    marginLeft: 1,
  },
  emptyState: {
    backgroundColor: "#10111A",
    borderWidth: 1,
    borderColor: "#242435",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: {
    color: "#E9E6F1",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  emptyText: {
    color: "#777383",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: 17,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#6046CC",
    borderRadius: 10,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  bottomNav: {
    height: 76,
    backgroundColor: "#0B0C14",
    borderTopWidth: 1,
    borderTopColor: "#1D1E29",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    color: "#656273",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 5,
    letterSpacing: 0.4,
  },
  navLabelActive: {
    color: "#9876FF",
  },
  pageContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },
  pageTitle: {
    color: "#F2EFF8",
    fontSize: 29,
    fontWeight: "700",
    marginTop: 3,
    marginBottom: 18,
  },
  streakHero: {
    alignItems: "center",
    backgroundColor: "#171525",
    borderWidth: 1,
    borderColor: "#302A4A",
    borderRadius: 20,
    paddingVertical: 24,
    marginBottom: 12,
  },
  streakNumber: {
    color: "#F2EFF8",
    fontSize: 54,
    fontWeight: "800",
    marginTop: 4,
  },
  streakLabel: {
    color: "#81799A",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0D0E17",
    borderWidth: 1,
    borderColor: "#242438",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 15,
  },
  statValue: {
    color: "#B39AFF",
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    color: "#696576",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 3,
  },
  panel: {
    backgroundColor: "#0D0E17",
    borderWidth: 1,
    borderColor: "#242438",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  panelTitle: {
    color: "#D9D3E8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekDay: {
    alignItems: "center",
  },
  dayCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#22212D",
    borderWidth: 1,
    borderColor: "#363344",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleComplete: {
    backgroundColor: "#684BE0",
    borderColor: "#8466F3",
  },
  weekDayLabel: {
    color: "#777383",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 6,
  },
  ruleText: {
    color: "#777383",
    fontSize: 10,
    lineHeight: 16,
    marginBottom: 8,
  },
  historyCard: {
    backgroundColor: "#10111A",
    borderWidth: 1,
    borderColor: "#202131",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  historyDate: {
    color: "#E8E5EF",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  historyXP: {
    color: "#8C83A0",
    fontSize: 9,
    marginTop: 4,
  },
  historyStatus: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#22212D",
    alignItems: "center",
    justifyContent: "center",
  },
  historyStatusComplete: {
    backgroundColor: "#20352A",
  },
  historyTask: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1D1E2A",
    paddingVertical: 9,
  },
  historyTaskTitle: {
    flex: 1,
    color: "#B7B2C2",
    fontSize: 11,
    marginLeft: 8,
  },
  historyTaskXP: {
    color: "#9D83FF",
    fontSize: 10,
    fontWeight: "700",
  },
  noTasksText: {
    color: "#696576",
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#11121D",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#302B49",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#F2EFF8",
    fontSize: 21,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#191A27",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#0D0E17",
    borderWidth: 1,
    borderColor: "#29283A",
    borderRadius: 12,
    color: "#F2EFF8",
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 13,
    marginBottom: 14,
  },
  modalLabel: {
    color: "#7168A0",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  optionRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 14,
  },
  optionButton: {
    backgroundColor: "#0D0E17",
    borderWidth: 1,
    borderColor: "#29283A",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  optionButtonActive: {
    backgroundColor: "#30245D",
    borderColor: "#7657E8",
  },
  optionButtonText: {
    color: "#777383",
    fontSize: 9,
    fontWeight: "700",
  },
  optionButtonTextActive: {
    color: "#C0AEFF",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayButton: {
    width: 39,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0D0E17",
    borderWidth: 1,
    borderColor: "#29283A",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonActive: {
    backgroundColor: "#30245D",
    borderColor: "#7657E8",
  },
  dayText: {
    color: "#777383",
    fontSize: 8,
    fontWeight: "800",
  },
  dayTextActive: {
    color: "#C0AEFF",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 5,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  secondaryButton: {
    backgroundColor: "#202131",
    borderWidth: 1,
    borderColor: "#303145",
  },
  secondaryButtonText: {
    color: "#A8A3B4",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  primaryButton: {
    backgroundColor: "#6046CC",
  },
  gradientButton: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
});

export default App;
