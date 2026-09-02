import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const avatar = require("./assets/avatar-neroth.png");

const STORAGE_KEY = "@ascensao_v01_state";

const WEEK_DAYS = [
  { value: 0, short: "DOM", label: "Domingo" },
  { value: 1, short: "SEG", label: "Segunda" },
  { value: 2, short: "TER", label: "Terça" },
  { value: 3, short: "QUA", label: "Quarta" },
  { value: 4, short: "QUI", label: "Quinta" },
  { value: 5, short: "SEX", label: "Sexta" },
  { value: 6, short: "SÁB", label: "Sábado" },
];

const ALL_WEEK_DAYS = WEEK_DAYS.map((day) => day.value);

const DIFFICULTIES = {
  muito_simples: {
    label: "Muito simples",
    xp: 5,
    coins: 0,
  },

  simples: {
    label: "Simples",
    xp: 10,
    coins: 1,
  },

  moderada: {
    label: "Moderada",
    xp: 15,
    coins: 2,
  },

  dificil: {
    label: "Difícil",
    xp: 20,
    coins: 2,
  },

  grande: {
    label: "Grande",
    xp: 30,
    coins: 3,
  },
};

const initialState = {
  player: {
    name: "Neroth",
    level: 1,
    xp: 0,
    coins: 0,
  },

  tasks: [],
};

function getTodayKey() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentWeekDay() {
  return new Date().getDay();
}

function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function calculateLevel(xp) {
  let level = 1;
  let remaining = xp;

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

/*
  Garante que uma task diária antiga,
  criada antes da implementação dos dias da semana,
  receba todos os dias como padrão.
*/
function normalizeWeekDays(task) {
  if (
    task.type !== "daily"
  ) {
    return task.daysOfWeek;
  }

  if (
    Array.isArray(task.daysOfWeek) &&
    task.daysOfWeek.length > 0
  ) {
    return task.daysOfWeek;
  }

  return ALL_WEEK_DAYS;
}

/*
  Atualiza as tasks para o dia atual.

  REGRAS:

  DIÁRIAS
  - Renovam automaticamente a cada novo dia.
  - Se concluídas ontem, voltam hoje como não concluídas.
  - Se não concluídas ontem, são perdidas e começam
    novamente hoje.
  - A recompensa pode ser conquistada novamente hoje.
  - Cada task possui seus próprios dias da semana.
  - Uma diária só aparece quando o dia atual está
    dentro de daysOfWeek.

  ESPECIAIS
  - Se não concluídas, permanecem disponíveis.
  - Se concluídas hoje, continuam visíveis durante o dia.
  - Se concluídas em um dia anterior, desaparecem.
*/
function refreshTasksForDate(tasks, today) {
  return tasks.reduce((result, task) => {
    // ==========================================
    // TASK DIÁRIA
    // ==========================================
    if (task.type === "daily") {
      const normalizedDays =
        normalizeWeekDays(task);

      if (task.date !== today) {
        result.push({
          ...task,

          daysOfWeek:
            normalizedDays,

          date: today,

          completed: false,

          completedAt: null,

          awardedXP: 0,

          awardedCoins: 0,
        });
      } else {
        result.push({
          ...task,

          daysOfWeek:
            normalizedDays,

          completedAt:
            task.completedAt ||
            (task.completed
              ? today
              : null),

          awardedXP:
            typeof task.awardedXP ===
            "number"
              ? task.awardedXP
              : task.completed
              ? task.xp
              : 0,

          awardedCoins:
            typeof task.awardedCoins ===
            "number"
              ? task.awardedCoins
              : task.completed
              ? task.coins
              : 0,
        });
      }

      return result;
    }

    // ==========================================
    // TASK ESPECIAL
    // ==========================================
    if (task.type === "special") {
      const completedAt =
        task.completedAt ||
        (task.completed
          ? task.date
          : null);

      // Especial concluída em dia anterior:
      // desaparece.
      if (
        task.completed &&
        completedAt &&
        completedAt !== today
      ) {
        return result;
      }

      // Especial pendente ou concluída hoje:
      // continua disponível.
      result.push({
        ...task,

        completedAt,

        awardedXP:
          typeof task.awardedXP ===
          "number"
            ? task.awardedXP
            : task.completed
            ? task.xp
            : 0,

        awardedCoins:
          typeof task.awardedCoins ===
          "number"
            ? task.awardedCoins
            : task.completed
            ? task.coins
            : 0,
      });

      return result;
    }

    return result;
  }, []);
}

function App() {
  const [state, setState] =
    useState(initialState);

  const [loaded, setLoaded] =
    useState(false);

  const [today, setToday] =
    useState(getTodayKey());

  const [taskModalVisible, setTaskModalVisible] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  const [taskTitle, setTaskTitle] =
    useState("");

  const [taskType, setTaskType] =
    useState("daily");

  const [difficulty, setDifficulty] =
    useState("simples");

  const [selectedDays, setSelectedDays] =
    useState(ALL_WEEK_DAYS);

  /*
    Verifica se o dia mudou enquanto o app
    permanece aberto.
  */
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDay =
        getTodayKey();

      if (currentDay !== today) {
        setToday(currentDay);
      }
    }, 30000);

    return () =>
      clearInterval(interval);
  }, [today]);

  /*
    Carrega o estado salvo.
  */
  useEffect(() => {
    loadState();
  }, []);

  /*
    Salva o estado sempre que ele muda.
  */
  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    ).catch(() => {});
  }, [state, loaded]);

  /*
    Atualiza as tasks quando o dia muda.
  */
  useEffect(() => {
    if (!loaded) return;

    setState((current) => ({
      ...current,

      tasks:
        refreshTasksForDate(
          current.tasks,
          today
        ),
    }));
  }, [today, loaded]);

  async function loadState() {
    try {
      const saved =
        await AsyncStorage.getItem(
          STORAGE_KEY
        );

      if (!saved) {
        setLoaded(true);
        return;
      }

      const parsed =
        JSON.parse(saved);

      const currentDay =
        getTodayKey();

      const updatedTasks =
        refreshTasksForDate(
          parsed.tasks || [],
          currentDay
        );

      setState({
        ...initialState,
        ...parsed,

        player: {
          ...initialState.player,
          ...(parsed.player || {}),
        },

        tasks: updatedTasks,
      });
    } catch (error) {
      console.log(
        "Erro ao carregar dados:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }

  /*
    Tasks que aparecem na Home hoje.

    Especiais:
    - sempre aparecem enquanto estiverem disponíveis.

    Diárias:
    - precisam estar marcadas para o dia atual.
  */
  const todayTasks = useMemo(() => {
    const currentWeekDay =
      getCurrentWeekDay();

    return state.tasks.filter(
      (task) => {
        if (
          task.type ===
          "special"
        ) {
          return true;
        }

        const days =
          normalizeWeekDays(
            task
          );

        return (
          task.date === today &&
          days.includes(
            currentWeekDay
          )
        );
      }
    );
  }, [state.tasks, today]);

  /*
    Meta de Hoje.

    Usamos awardedXP para representar
    exatamente quanto XP aquela task
    concedeu quando foi concluída.

    Isso evita problemas caso uma task
    concluída seja editada depois.
  */
  const completedXP = useMemo(() => {
    return todayTasks
      .filter(
        (task) =>
          task.completed
      )
      .reduce(
        (total, task) =>
          total +
          (typeof task.awardedXP ===
          "number"
            ? task.awardedXP
            : task.xp),
        0
      );
  }, [todayTasks]);

  const dailyTargetProgress =
    Math.min(
      completedXP / 30,
      1
    );

  const levelInfo =
    calculateLevel(
      state.player.xp
    );

  function openCreateTask() {
    setEditingTask(null);

    setTaskTitle("");

    setTaskType("daily");

    setDifficulty("simples");

    setSelectedDays(
      ALL_WEEK_DAYS
    );

    setTaskModalVisible(true);
  }

  function openEditTask(task) {
    setEditingTask(task);

    setTaskTitle(
      task.title
    );

    setTaskType(
      task.type
    );

    setDifficulty(
      task.difficulty
    );

    setSelectedDays(
      task.type === "daily"
        ? normalizeWeekDays(
            task
          )
        : ALL_WEEK_DAYS
    );

    setTaskModalVisible(true);
  }

  function closeTaskModal() {
    setTaskModalVisible(false);

    setEditingTask(null);

    setTaskTitle("");

    setSelectedDays(
      ALL_WEEK_DAYS
    );
  }

  function toggleWeekDay(day) {
    setSelectedDays(
      (current) => {
        if (
          current.includes(day)
        ) {
          /*
            Impede que o usuário
            deixe a task sem nenhum
            dia selecionado.
          */
          if (
            current.length === 1
          ) {
            return current;
          }

          return current.filter(
            (item) =>
              item !== day
          );
        }

        return [
          ...current,
          day,
        ].sort(
          (a, b) => a - b
        );
      }
    );
  }

  function selectAllDays() {
    setSelectedDays(
      ALL_WEEK_DAYS
    );
  }

  function saveTask() {
    const title =
      taskTitle.trim();

    if (!title) {
      Alert.alert(
        "Task sem nome",
        "Digite um nome para a task."
      );

      return;
    }

    if (
      taskType === "daily" &&
      selectedDays.length === 0
    ) {
      Alert.alert(
        "Escolha os dias",
        "Selecione pelo menos um dia da semana."
      );

      return;
    }

    const reward =
      DIFFICULTIES[
        difficulty
      ];

    if (editingTask) {
      setState((current) => ({
        ...current,

        tasks:
          current.tasks.map(
            (task) => {
              if (
                task.id !==
                editingTask.id
              ) {
                return task;
              }

              const isCompleted =
                task.completed;

              return {
                ...task,

                title,

                type:
                  taskType,

                difficulty,

                xp:
                  reward.xp,

                coins:
                  reward.coins,

                daysOfWeek:
                  taskType ===
                  "daily"
                    ? selectedDays
                    : undefined,

                completed:
                  isCompleted,

                completedAt:
                  isCompleted
                    ? task.completedAt ||
                      today
                    : null,

                /*
                  Mantemos a recompensa
                  que realmente foi dada.
                */
                awardedXP:
                  isCompleted
                    ? typeof task.awardedXP ===
                      "number"
                      ? task.awardedXP
                      : task.xp
                    : 0,

                awardedCoins:
                  isCompleted
                    ? typeof task.awardedCoins ===
                      "number"
                      ? task.awardedCoins
                      : task.coins
                    : 0,

                date:
                  taskType ===
                  "daily"
                    ? today
                    : task.date,
              };
            }
          ),
      }));
    } else {
      const newTask = {
        id: createId(),

        title,

        type: taskType,

        difficulty,

        xp:
          reward.xp,

        coins:
          reward.coins,

        daysOfWeek:
          taskType ===
          "daily"
            ? selectedDays
            : undefined,

        completed: false,

        completedAt: null,

        awardedXP: 0,

        awardedCoins: 0,

        date: today,

        createdAt:
          new Date().toISOString(),
      };

      setState((current) => ({
        ...current,

        tasks: [
          newTask,
          ...current.tasks,
        ],
      }));
    }

    closeTaskModal();
  }

  /*
    Exclui uma task.

    Se ela estava concluída,
    removemos também exatamente
    as recompensas que ela concedeu.

    A Meta de Hoje é recalculada
    automaticamente porque ela é
    baseada nas tasks existentes.
  */
  function deleteTask(task) {
    Alert.alert(
      "Excluir task",
      `Deseja excluir "${task.title}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },

        {
          text: "Excluir",
          style: "destructive",

          onPress: () => {
            setState((current) => {
              const awardedXP =
                task.completed
                  ? typeof task.awardedXP ===
                    "number"
                    ? task.awardedXP
                    : task.xp
                  : 0;

              const awardedCoins =
                task.completed
                  ? typeof task.awardedCoins ===
                    "number"
                    ? task.awardedCoins
                    : task.coins
                  : 0;

              return {
                ...current,

                player: {
                  ...current.player,

                  xp: Math.max(
                    0,
                    current.player.xp -
                      awardedXP
                  ),

                  coins: Math.max(
                    0,
                    current.player.coins -
                      awardedCoins
                  ),
                },

                tasks:
                  current.tasks.filter(
                    (item) =>
                      item.id !==
                      task.id
                  ),
              };
            });
          },
        },
      ]
    );
  }

  /*
    CONCLUIR / DESFAZER TASK

    Pendente → Concluída
      + XP
      + moedas
      + XP da Meta de Hoje

    Concluída → Pendente
      - XP
      - moedas
      - XP da Meta de Hoje

    A Meta de Hoje é recalculada
    automaticamente com base nas
    tasks concluídas.
  */
  function toggleTask(task) {
    setState((current) => {
      const currentTask =
        current.tasks.find(
          (item) =>
            item.id ===
            task.id
        );

      if (!currentTask) {
        return current;
      }

      const wasCompleted =
        currentTask.completed;

      const awardedXP =
        typeof currentTask.awardedXP ===
        "number"
          ? currentTask.awardedXP
          : currentTask.xp;

      const awardedCoins =
        typeof currentTask.awardedCoins ===
        "number"
          ? currentTask.awardedCoins
          : currentTask.coins;

      // ==========================================
      // DESFAZER
      // ==========================================
      if (wasCompleted) {
        return {
          ...current,

          player: {
            ...current.player,

            xp: Math.max(
              0,
              current.player.xp -
                awardedXP
            ),

            coins: Math.max(
              0,
              current.player.coins -
                awardedCoins
            ),
          },

          tasks:
            current.tasks.map(
              (item) =>
                item.id ===
                currentTask.id
                  ? {
                      ...item,

                      completed:
                        false,

                      completedAt:
                        null,

                      awardedXP:
                        0,

                      awardedCoins:
                        0,
                    }
                  : item
            ),
        };
      }

      // ==========================================
      // CONCLUIR
      // ==========================================
      return {
        ...current,

        player: {
          ...current.player,

          xp:
            current.player.xp +
            currentTask.xp,

          coins:
            current.player.coins +
            currentTask.coins,
        },

        tasks:
          current.tasks.map(
            (item) =>
              item.id ===
              currentTask.id
                ? {
                    ...item,

                    completed:
                      true,

                    completedAt:
                      today,

                    awardedXP:
                      currentTask.xp,

                    awardedCoins:
                      currentTask.coins,
                  }
                : item
          ),
      };
    });
  }

  function renderTask(task) {
    return (
      <Pressable
        key={task.id}
        onPress={() =>
          toggleTask(task)
        }
        onLongPress={() =>
          openEditTask(task)
        }
        style={({ pressed }) => [
          styles.taskCard,

          pressed &&
            styles.pressed,

          task.completed &&
            styles.taskCompleted,
        ]}
      >
        <View
          style={[
            styles.taskCheck,

            task.completed &&
              styles.taskCheckCompleted,
          ]}
        >
          {task.completed && (
            <Ionicons
              name="checkmark"
              size={17}
              color="#FFFFFF"
            />
          )}
        </View>

        <View
          style={
            styles.taskContent
          }
        >
          <View
            style={
              styles.taskTitleRow
            }
          >
            <Text
              style={[
                styles.taskTitle,

                task.completed &&
                  styles.taskTitleCompleted,
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            {task.type ===
              "special" &&
              !task.completed && (
                <View
                  style={
                    styles.specialBadge
                  }
                >
                  <Text
                    style={
                      styles.specialBadgeText
                    }
                  >
                    !
                  </Text>
                </View>
              )}
          </View>

          <View
            style={
              styles.taskMeta
            }
          >
            <Text
              style={
                styles.taskDifficulty
              }
            >
              {
                DIFFICULTIES[
                  task.difficulty
                ].label
              }
            </Text>

            <Text
              style={styles.taskXP}
            >
              +{task.xp} XP
            </Text>

            {task.coins > 0 && (
              <View
                style={
                  styles.coinReward
                }
              >
                <Ionicons
                  name="ellipse"
                  size={9}
                  color="#F2C94C"
                />

                <Text
                  style={
                    styles.coinRewardText
                  }
                >
                  +{task.coins}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={
            styles.taskActions
          }
        >
          <Pressable
            onPress={() =>
              openEditTask(task)
            }
            hitSlop={10}
            style={
              styles.smallAction
            }
          >
            <Ionicons
              name="create-outline"
              size={17}
              color="#8D8AA2"
            />
          </Pressable>

          <Pressable
            onPress={() =>
              deleteTask(task)
            }
            hitSlop={10}
            style={
              styles.smallAction
            }
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color="#8D8AA2"
            />
          </Pressable>
        </View>
      </Pressable>
    );
  }

  if (!loaded) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <Text
          style={
            styles.loadingTitle
          }
        >
          ASCENSÃO
        </Text>

        <Text
          style={
            styles.loadingText
          }
        >
          Carregando seu progresso...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#070811"
      />

      <View
        style={styles.container}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {/* ======================================
              HEADER
          ====================================== */}

          <View
            style={styles.header}
          >
            <View
              style={
                styles.profileArea
              }
            >
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Personagem",
                    "A edição do personagem será adicionada no próximo bloco."
                  )
                }
              >
                <View
                  style={
                    styles.avatarFrame
                  }
                >
                  <Image
                    source={avatar}
                    style={
                      styles.avatar
                    }
                  />
                </View>
              </Pressable>

              <View>
                <Text
                  style={
                    styles.greeting
                  }
                >
                  BEM-VINDO DE VOLTA
                </Text>

                <Text
                  style={
                    styles.playerName
                  }
                >
                  {
                    state.player
                      .name
                  }
                </Text>
              </View>
            </View>

            <View
              style={
                styles.coinHeader
              }
            >
              <Ionicons
                name="ellipse"
                size={12}
                color="#F2C94C"
              />

              <Text
                style={
                  styles.coinHeaderText
                }
              >
                {
                  state.player
                    .coins
                }
              </Text>
            </View>
          </View>

          {/* ======================================
              PROGRESSÃO
          ====================================== */}

          <View
            style={
              styles.progressCard
            }
          >
            <View
              style={
                styles.progressTop
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  PROGRESSÃO
                </Text>

                <Text
                  style={
                    styles.levelText
                  }
                >
                  Nível{" "}
                  {levelInfo.level}
                </Text>
              </View>

              <Text
                style={
                  styles.xpText
                }
              >
                {
                  levelInfo.currentXP
                }{" "}
                /{" "}
                {
                  levelInfo.requiredXP
                }{" "}
                XP
              </Text>
            </View>

            <View
              style={styles.xpBar}
            >
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${
                      (levelInfo.currentXP /
                        levelInfo.requiredXP) *
                      100
                    }%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* ======================================
              META DIÁRIA
          ====================================== */}

          <View
            style={styles.dailyCard}
          >
            <View
              style={
                styles.dailyHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  META DE HOJE
                </Text>

                <Text
                  style={
                    styles.dailyXP
                  }
                >
                  {completedXP}{" "}
                  <Text
                    style={
                      styles.dailyXPDim
                    }
                  >
                    / 30 XP
                  </Text>
                </Text>
              </View>

              <View
                style={[
                  styles.targetStatus,

                  completedXP >= 30 &&
                    styles.targetStatusComplete,
                ]}
              >
                <Ionicons
                  name={
                    completedXP >= 30
                      ? "checkmark"
                      : "flame"
                  }
                  size={16}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.targetStatusText
                  }
                >
                  {completedXP >=
                  30
                    ? "CONCLUÍDA"
                    : "EM PROGRESSO"}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.dailyBar
              }
            >
              <LinearGradient
                colors={[
                  "#6C4DFF",
                  "#A875FF",
                ]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 0,
                }}
                style={[
                  styles.dailyFill,
                  {
                    width: `${
                      dailyTargetProgress *
                      100
                    }%`,
                  },
                ]}
              />
            </View>

            <Text
              style={
                styles.dailyHint
              }
            >
              Complete tasks para
              alcançar sua meta
              diária.
            </Text>
          </View>

          {/* ======================================
              TASKS
          ====================================== */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                HOJE
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Suas tasks
              </Text>
            </View>

            <Pressable
              onPress={
                openCreateTask
              }
              style={
                styles.addButton
              }
            >
              <Ionicons
                name="add"
                size={22}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {todayTasks.length ===
          0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <MaterialCommunityIcons
                name="sword-cross"
                size={32}
                color="#7162B7"
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Nenhuma task por
                aqui
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Crie sua primeira
                task e comece sua
                ascensão.
              </Text>

              <Pressable
                onPress={
                  openCreateTask
                }
                style={
                  styles.emptyButton
                }
              >
                <Text
                  style={
                    styles.emptyButtonText
                  }
                >
                  CRIAR TASK
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={
                styles.taskList
              }
            >
              {todayTasks.map(
                renderTask
              )}
            </View>
          )}

          <View
            style={styles.infoBox}
          >
            <Ionicons
              name="information-circle-outline"
              size={19}
              color="#8175B5"
            />

            <Text
              style={styles.infoText}
            >
              Toque numa task para
              concluí-la ou desfazê-la.
              Segure ou use o lápis
              para editar.
            </Text>
          </View>
        </ScrollView>

        {/* ======================================
            BOTTOM NAV
        ====================================== */}

        <View
          style={styles.bottomNav}
        >
          <NavItem
            icon="home"
            label="HOJE"
            active
          />

          <NavItem
            icon="flame-outline"
            label="STREAK"
            onPress={() =>
              Alert.alert(
                "Streak",
                "O sistema de streak será ativado no próximo bloco."
              )
            }
          />

          <NavItem
            icon="person-outline"
            label="PERSONAGEM"
            onPress={() =>
              Alert.alert(
                "Personagem",
                "A tela de personagem será ativada no próximo bloco."
              )
            }
          />

          <NavItem
            icon="skull-outline"
            label="BOSSES"
            onPress={() =>
              Alert.alert(
                "Bosses",
                "O sistema de bosses será ativado no próximo bloco."
              )
            }
          />

          <NavItem
            icon="storefront-outline"
            label="LOJA"
            onPress={() =>
              Alert.alert(
                "Loja",
                "A Loja será ativada no próximo bloco."
              )
            }
          />
        </View>
      </View>

      {/* ========================================
          MODAL DE TASK
      ======================================== */}

      <Modal
        visible={
          taskModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeTaskModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalBackdrop
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={
              styles.modalDismissArea
            }
            onPress={
              closeTaskModal
            }
          />

          <View
            style={
              styles.taskModal
            }
          >
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.sectionEyebrow
                    }
                  >
                    {editingTask
                      ? "EDITAR"
                      : "NOVA"}
                  </Text>

                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {editingTask
                      ? "Editar task"
                      : "Criar task"}
                  </Text>
                </View>

                <Pressable
                  onPress={
                    closeTaskModal
                  }
                  style={
                    styles.modalClose
                  }
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color="#AAA7BA"
                  />
                </Pressable>
              </View>

              {/* NOME */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                NOME DA TASK
              </Text>

              <TextInput
                value={
                  taskTitle
                }
                onChangeText={
                  setTaskTitle
                }
                placeholder="Ex.: Treinar 30 minutos"
                placeholderTextColor="#666477"
                style={
                  styles.textInput
                }
                autoFocus
                maxLength={70}
              />

              {/* TIPO */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                TIPO
              </Text>

              <View
                style={
                  styles.optionRow
                }
              >
                <OptionButton
                  label="DIÁRIA"
                  active={
                    taskType ===
                    "daily"
                  }
                  onPress={() =>
                    setTaskType(
                      "daily"
                    )
                  }
                />

                <OptionButton
                  label="ESPECIAL"
                  active={
                    taskType ===
                    "special"
                  }
                  onPress={() =>
                    setTaskType(
                      "special"
                    )
                  }
                />
              </View>

              {/* DIAS DA SEMANA */}

              {taskType ===
                "daily" && (
                <>
                  <View
                    style={
                      styles.daysHeader
                    }
                  >
                    <Text
                      style={
                        styles.inputLabel
                      }
                    >
                      DIAS DA SEMANA
                    </Text>

                    <Pressable
                      onPress={
                        selectAllDays
                      }
                      hitSlop={8}
                    >
                      <Text
                        style={
                          styles.selectAllText
                        }
                      >
                        TODOS
                      </Text>
                    </Pressable>
                  </View>

                  <View
                    style={
                      styles.weekDaysGrid
                    }
                  >
                    {WEEK_DAYS.map(
                      (day) => {
                        const active =
                          selectedDays.includes(
                            day.value
                          );

                        return (
                          <Pressable
                            key={
                              day.value
                            }
                            onPress={() =>
                              toggleWeekDay(
                                day.value
                              )
                            }
                            style={[
                              styles.weekDayButton,

                              active &&
                                styles.weekDayButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.weekDayText,

                                active &&
                                  styles.weekDayTextActive,
                              ]}
                            >
                              {
                                day.short
                              }
                            </Text>
                          </Pressable>
                        );
                      }
                    )}
                  </View>

                  <Text
                    style={
                      styles.daysHint
                    }
                  >
                    A task aparecerá
                    somente nos dias
                    selecionados.
                  </Text>
                </>
              )}

              {/* DIFICULDADE */}

              <Text
                style={
                  styles.inputLabel
                }
              >
                DIFICULDADE
              </Text>

              <View
                style={
                  styles.difficultyGrid
                }
              >
                {Object.entries(
                  DIFFICULTIES
                ).map(
                  ([
                    key,
                    value,
                  ]) => (
                    <Pressable
                      key={key}
                      onPress={() =>
                        setDifficulty(
                          key
                        )
                      }
                      style={[
                        styles.difficultyButton,

                        difficulty ===
                          key &&
                          styles.difficultyButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.difficultyName,

                          difficulty ===
                            key &&
                            styles.difficultyNameActive,
                        ]}
                      >
                        {
                          value.label
                        }
                      </Text>

                      <Text
                        style={[
                          styles.difficultyReward,

                          difficulty ===
                            key &&
                            styles.difficultyRewardActive,
                        ]}
                      >
                        +{value.xp} XP •{" "}
                        {
                          value.coins
                        }{" "}
                        🪙
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <Text
                style={
                  styles.systemNote
                }
              >
                O sistema define
                automaticamente a
                recompensa.
              </Text>

              {/* SALVAR */}

              <Pressable
                onPress={
                  saveTask
                }
                style={
                  styles.saveButton
                }
              >
                <LinearGradient
                  colors={[
                    "#6548F5",
                    "#8B63FF",
                  ]}
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 0,
                  }}
                  style={
                    styles.saveButtonGradient
                  }
                >
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {editingTask
                      ? "SALVAR ALTERAÇÕES"
                      : "CRIAR TASK"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={
        styles.navItem
      }
    >
      <Ionicons
        name={icon}
        size={21}
        color={
          active
            ? "#9876FF"
            : "#656273"
        }
      />

      <Text
        style={[
          styles.navLabel,
          active &&
            styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OptionButton({
  label,
  active,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionButton,
        active &&
          styles.optionButtonActive,
      ]}
    >
      <Text
        style={[
          styles.optionButtonText,
          active &&
            styles.optionButtonTextActive,
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

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 110,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  profileArea: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarFrame: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#7657DB",
    backgroundColor: "#151326",
    padding: 3,
    marginRight: 11,
  },

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },

  greeting: {
    color: "#777487",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 3,
  },

  playerName: {
    color: "#F3F1FA",
    fontSize: 20,
    fontWeight: "700",
  },

  coinHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#11121D",
    borderWidth: 1,
    borderColor: "#252638",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  coinHeaderText: {
    color: "#E7E4F0",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 14,
  },

  progressCard: {
    backgroundColor: "#0F101A",
    borderWidth: 1,
    borderColor: "#202131",
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },

  sectionEyebrow: {
    color: "#7168A0",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  levelText: {
    color: "#F2EFFA",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 3,
  },

  xpText: {
    color: "#9D98AD",
    fontSize: 11,
    fontWeight: "600",
  },

  xpBar: {
    height: 7,
    backgroundColor: "#222333",
    borderRadius: 10,
    overflow: "hidden",
  },

  xpFill: {
    height: "100%",
    backgroundColor: "#7455EA",
    borderRadius: 10,
  },

  dailyCard: {
    backgroundColor: "#10111C",
    borderWidth: 1,
    borderColor: "#29253C",
    borderRadius: 18,
    padding: 17,
    marginBottom: 25,
  },

  dailyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },

  dailyXP: {
    color: "#F3F0FB",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 2,
  },

  dailyXPDim: {
    color: "#777487",
    fontSize: 15,
    fontWeight: "600",
  },

  targetStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252039",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  targetStatusComplete: {
    backgroundColor: "#294A3A",
  },

  targetStatusText: {
    color: "#DDD8E9",
    fontSize: 8,
    fontWeight: "800",
    marginLeft: 5,
    letterSpacing: 0.5,
  },

  dailyBar: {
    height: 9,
    borderRadius: 10,
    backgroundColor: "#242332",
    overflow: "hidden",
  },

  dailyFill: {
    height: "100%",
    borderRadius: 10,
  },

  dailyHint: {
    color: "#6F6C7B",
    fontSize: 10,
    marginTop: 9,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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

  pressed: {
    opacity: 0.75,
  },

  taskCompleted: {
    opacity: 0.48,
    borderColor: "#282837",
  },

  taskCheck: {
    width: 25,
    height: 25,
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

  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  taskTitle: {
    color: "#E8E5EF",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },

  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#85818E",
  },

  specialBadge: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: "#38252F",
    borderWidth: 1,
    borderColor: "#704052",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  specialBadgeText: {
    color: "#D87591",
    fontSize: 12,
    fontWeight: "800",
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

  coinReward: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  coinRewardText: {
    color: "#A09CA9",
    fontSize: 9,
    marginLeft: 3,
  },

  taskActions: {
    flexDirection: "row",
    marginLeft: 6,
  },

  smallAction: {
    padding: 5,
    marginLeft: 2,
  },

  emptyCard: {
    backgroundColor: "#10111A",
    borderWidth: 1,
    borderColor: "#242435",
    borderRadius: 18,
    padding: 26,
    alignItems: "center",
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
    maxWidth: 260,
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

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0E17",
    borderWidth: 1,
    borderColor: "#1D1E2B",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 12,
  },

  infoText: {
    flex: 1,
    color: "#6F6C7B",
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 8,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
    fontSize: 7,
    fontWeight: "700",
    marginTop: 5,
    letterSpacing: 0.4,
  },

  navLabelActive: {
    color: "#9876FF",
  },

  // ==========================================
  // MODAL
  // ==========================================

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },

  modalDismissArea: {
    flex: 1,
  },

  taskModal: {
    backgroundColor: "#11121D",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#29283A",
    maxHeight: "90%",
  },

  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    color: "#F2EFF8",
    fontSize: 23,
    fontWeight: "700",
    marginTop: 3,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#1B1C29",
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    color: "#77719B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 5,
  },

  textInput: {
    height: 48,
    backgroundColor: "#0B0C14",
    borderWidth: 1,
    borderColor: "#292A39",
    borderRadius: 12,
    color: "#E9E6F1",
    paddingHorizontal: 13,
    fontSize: 13,
    marginBottom: 17,
  },

  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 17,
  },

  optionButton: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#0B0C14",
    borderWidth: 1,
    borderColor: "#292A39",
    alignItems: "center",
    justifyContent: "center",
  },

  optionButtonActive: {
    backgroundColor: "#2A2050",
    borderColor: "#7655E8",
  },

  optionButtonText: {
    color: "#777487",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  optionButtonTextActive: {
    color: "#B59EFF",
  },

  // ==========================================
  // DIAS DA SEMANA
  // ==========================================

  daysHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  selectAllText: {
    color: "#9876FF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  weekDaysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  weekDayButton: {
    width: 42,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#0B0C14",
    borderWidth: 1,
    borderColor: "#292A39",
    alignItems: "center",
    justifyContent: "center",
  },

  weekDayButtonActive: {
    backgroundColor: "#2A2050",
    borderColor: "#7655E8",
  },

  weekDayText: {
    color: "#686577",
    fontSize: 8,
    fontWeight: "800",
  },

  weekDayTextActive: {
    color: "#B59EFF",
  },

  daysHint: {
    color: "#646171",
    fontSize: 9,
    marginBottom: 17,
  },

  // ==========================================
  // DIFICULDADE
  // ==========================================

  difficultyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },

  difficultyButton: {
    width: "48%",
    minHeight: 53,
    backgroundColor: "#0B0C14",
    borderWidth: 1,
    borderColor: "#292A39",
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },

  difficultyButtonActive: {
    backgroundColor: "#2A2050",
    borderColor: "#7655E8",
  },

  difficultyName: {
    color: "#858190",
    fontSize: 10,
    fontWeight: "700",
  },

  difficultyNameActive: {
    color: "#E3DDF5",
  },

  difficultyReward: {
    color: "#666273",
    fontSize: 9,
    marginTop: 3,
  },

  difficultyRewardActive: {
    color: "#A88FFF",
  },

  systemNote: {
    color: "#666273",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
    marginBottom: 17,
  },

  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
  },

  saveButtonGradient: {
    height: 49,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
});

export default App;
