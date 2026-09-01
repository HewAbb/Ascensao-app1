import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Modal,
  SafeAreaView, StatusBar
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const PURPLE = "#9B4DFF";
const PURPLE2 = "#6C24E8";
const BG = "#05050B";
const CARD = "#0B0B16";
const BORDER = "#25213A";
const MUTED = "#8C89A7";
const WHITE = "#F5F3FA";
const GREEN = "#69D46B";
const RED = "#FF456A";
const BLUE = "#36A3FF";
const GOLD = "#F6C742";

const avatar = require("./assets/avatar-neroth.png");

const tasksInitial = [
  { id: 1, icon: "🚿", title: "Tomar banho", xp: 10, done: false },
  { id: 2, icon: "🛏️", title: "Arrumar a cama", xp: 5, done: false },
  { id: 3, icon: "💧", title: "Beber água (2 copos)", xp: 5, done: false },
  { id: 4, icon: "🏋️", title: "Academia", xp: 20, done: false },
  { id: 5, icon: "📖", title: "Ler por 10 min", xp: 10, done: false },
];

const cosmetics = [
  { id: "classic", cat: "MOLDURA", name: "Clássica", price: 10, owned: true, equipped: true, icon: "◈" },
  { id: "eclipse", cat: "MOLDURA", name: "Eclipse", price: 30, owned: true, icon: "✦" },
  { id: "icy", cat: "MOLDURA", name: "Gélida", price: 20, owned: false, icon: "◇" },
  { id: "gold", cat: "MOLDURA", name: "Dourada", price: 25, owned: false, icon: "✧" },
  { id: "forest", cat: "MOLDURA", name: "Floresta", price: 20, owned: true, icon: "❖" },
  { id: "infernal", cat: "MOLDURA", name: "Infernal", price: 30, owned: false, icon: "♢" },
  { id: "cyber", cat: "MOLDURA", name: "Cibernética", price: 20, owned: false, icon: "⬡" },
  { id: "sakura", cat: "MOLDURA", name: "Sakura", price: 25, owned: false, icon: "✿" },
  { id: "shadow", cat: "AURA", name: "Chama Sombria", owned: true, equipped: true, icon: "♨" },
  { id: "void", cat: "TRAJE", name: "Manto do Vazio", owned: true, equipped: true, icon: "◈" },
  { id: "violet", cat: "OLHOS", name: "Olhar Violeta", owned: true, icon: "◉" },
  { id: "earring", cat: "ACESSÓRIO", name: "Brinco Negro", owned: true, equipped: true, icon: "●" },
];

const rewards = [
  ["🎮", "1h de videogame", "Aproveite 1 hora de jogo sem culpa.", 20],
  ["🍔", "Lanche especial", "Escolha um lanche especial de sua preferência.", 30],
  ["🎬", "Sessão de filme", "Assista a um filme da sua escolha.", 25],
  ["☕", "Café especial", "Um café especial para seu dia render mais.", 10],
  ["⏰", "Dormir até mais tarde", "Durma até mais tarde no próximo dia.", 20],
  ["📚", "Tempo de leitura", "Reserve um tempo só para ler o que você gosta.", 15],
  ["🍰", "Doce recompensa", "Um doce para adoçar seu dia.", 15],
  ["🎧", "Sua playlist", "Ouça sua playlist favorita sem interrupções.", 10],
];

function Header({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={28} color={WHITE} />
        </Pressable>
      ) : (
        <Pressable style={styles.iconButton}>
          <Ionicons name="menu" size={27} color={WHITE} />
        </Pressable>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {right || <View style={{ width: 48 }} />}
    </View>
  );
}

function Coin({ value }) {
  return (
    <View style={styles.coinPill}>
      <Text style={{ fontSize: 19 }}>🪙</Text>
      <Text style={styles.coinText}>{value}</Text>
    </View>
  );
}

function ProgressBar({ value, max, color = PURPLE }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.progressTrack}>
      <LinearGradient colors={[PURPLE2, color]} start={{x:0,y:0}} end={{x:1,y:0}}
        style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

function BottomNav({ active, setScreen }) {
  const items = [
    ["home", "HOJE", "home-outline"],
    ["streak", "STREAK", "flame-outline"],
    ["bosses", "BOSSES", "skull-outline"],
    ["character", "PERSONAGEM", "person-outline"],
    ["shop", "LOJA", "storefront-outline"],
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map(([key, label, icon]) => (
        <Pressable key={key} onPress={() => setScreen(key)} style={[styles.navItem, active === key && styles.navActive]}>
          <Ionicons name={active === key ? icon.replace("-outline","") : icon} size={25} color={active === key ? "#B66BFF" : MUTED} />
          <Text style={[styles.navLabel, active === key && {color:"#B66BFF"}]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Home({ setScreen, coins, setCoins }) {
  const [tasks, setTasks] = useState(tasksInitial);
  const [pause, setPause] = useState(false);
  const done = tasks.filter(t => t.done).length;
  const xp = 110 + tasks.filter(t => t.done).reduce((a,t)=>a+t.xp,0);
  const toggle = id => setTasks(ts => ts.map(t => t.id === id ? {...t, done: !t.done} : t));
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconButton}><Ionicons name="menu" size={27} color={WHITE}/></Pressable>
          <Ionicons name="moon" size={28} color="#71F57B"/>
          <Coin value={coins}/>
        </View>

        <View style={styles.profileRow}>
          <Pressable onPress={()=>setScreen("editor")} style={styles.avatarSmallWrap}>
            <Image source={avatar} style={styles.avatarSmall}/>
          </Pressable>
          <View style={{flex:1, marginLeft:18}}>
            <Text style={styles.name}>NEROTH</Text>
            <Text style={styles.subtitle}>NÍVEL 8  •  GUERREIRO</Text>
          </View>
        </View>

        <View style={styles.xpRow}><Text style={styles.muted}>XP</Text><Text style={styles.muted}>620 / 1.200</Text></View>
        <ProgressBar value={620} max={1200}/>

        <View style={styles.statRow}>
          <Pressable style={styles.statCard}><Text style={{fontSize:22}}>🔥</Text><Text style={styles.statLabel}>STREAK</Text><Text style={styles.statValue}>3</Text><Text style={styles.muted}>dias</Text></Pressable>
          <Pressable style={styles.statCard}><Ionicons name="shield-outline" size={23} color="#BFA9FF"/><Text style={styles.statLabel}>SAVE POINTS</Text><Text style={styles.statValue}>1</Text><Text style={styles.muted}>disponível</Text></Pressable>
          <Pressable style={styles.statCard} onPress={()=>setScreen("history")}><Ionicons name="calendar-outline" size={23} color="#BFA9FF"/><Text style={styles.statLabel}>HISTÓRICO</Text><Text style={[styles.muted,{marginTop:12}]}>Ver progresso  ›</Text></Pressable>
        </View>

        <SectionTitle title="TAREFAS DE HOJE" action="+" />
        {tasks.map(t => (
          <Pressable key={t.id} onPress={()=>toggle(t.id)} style={styles.task}>
            <View style={[styles.checkbox, t.done && styles.checkboxDone]}>
              {t.done && <Ionicons name="checkmark" size={17} color={BG}/>}
            </View>
            <Text style={{fontSize:22, marginRight:14}}>{t.icon}</Text>
            <Text style={[styles.taskTitle, t.done && {textDecorationLine:"line-through", color:MUTED}]}>{t.title}</Text>
            <Text style={styles.taskXP}>+{t.xp} XP</Text>
            <Ionicons name="information-circle-outline" size={23} color={MUTED}/>
          </Pressable>
        ))}

        <SectionTitle title="ATRASADAS" red />
        <View style={styles.task}>
          <View style={[styles.checkbox,{borderColor:RED}]}><Text style={{color:RED}}>!</Text></View>
          <Text style={{fontSize:22, marginRight:14}}>🏍️</Text>
          <View style={{flex:1}}><Text style={styles.taskTitle}>Lavar a moto</Text><Text style={{color:RED,marginTop:3}}>Atrasada há 2 dias</Text></View>
          <Text style={[styles.taskXP,{color:RED}]}>+15 XP</Text>
          <Ionicons name="information-circle-outline" size={23} color={MUTED}/>
        </View>

        <SectionTitle title="BOSS ATIVO" action="Ver batalha" />
        <Pressable style={styles.bossHome} onPress={()=>setScreen("bosses")}>
          <View style={styles.bossIcon}><Text style={{fontSize:34}}>👹</Text></View>
          <View style={{flex:1}}>
            <Text style={styles.bossTitle}>O CAOS</Text>
            <Text style={styles.muted}>700 / 700 HP  •  Fase 1</Text>
            <ProgressBar value={1} max={1} color={RED}/>
          </View>
        </Pressable>

        <Pressable onPress={()=>setPause(true)} style={styles.pauseLink}>
          <Ionicons name="pause-circle-outline" size={19} color="#8FE36B"/>
          <Text style={{color:"#8FE36B"}}> Modo pausa</Text>
        </Pressable>
      </ScrollView>
      <BottomNav active="home" setScreen={setScreen}/>
      <PauseModal visible={pause} onClose={()=>setPause(false)}/>
    </SafeAreaView>
  );
}

function SectionTitle({title, action, red}) {
  return <View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, red&&{color:RED}]}>{title}</Text>{action && <Text style={styles.sectionAction}>{action}</Text>}</View>
}

function PauseModal({visible,onClose}) {
  return <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalBackdrop}>
      <View style={styles.pauseModal}>
        <Pressable onPress={onClose} style={styles.modalClose}><Ionicons name="close" size={26} color="#8FE36B"/></Pressable>
        <Ionicons name="pause-circle" size={68} color="#9FE36C"/>
        <Text style={[styles.modalTitle,{color:"#A8D985"}]}>MODO PAUSA</Text>
        <Text style={styles.modalLead}>Respire. Desacelere. Você merece uma pausa.</Text>
        <Text style={styles.mutedCenter}>Seu progresso continua aqui quando você voltar.</Text>
        <View style={styles.infoBox}>
          {["Suas tarefas ficam suspensas","XP e moedas ficam congelados","Seus atributos ficam congelados"].map(x=><View style={styles.infoLine} key={x}><Ionicons name="checkmark-circle-outline" size={22} color="#8ED15F"/><Text style={styles.infoText}>{x}</Text></View>)}
          <View style={styles.infoLine}><Ionicons name="close-circle-outline" size={22} color={RED}/><Text style={styles.infoText}>Seu streak não é protegido</Text></View>
        </View>
        <Text style={styles.greenSmall}>DURAÇÃO DA PAUSA</Text>
        <View style={styles.durationRow}>{["1 DIA","3 DIAS","7 DIAS","PERSONALIZADA","ATÉ EU CANCELAR"].map((x,i)=><View key={x} style={[styles.duration,{borderColor:i===3?"#8ED15F":BORDER}]}><Text style={styles.durationText}>{x}</Text></View>)}</View>
        <Pressable onPress={onClose} style={[styles.primaryButton,{borderColor:"#8ED15F"}]}><Text style={{color:"#A8D985",fontWeight:"800"}}>Ⅱ  ATIVAR PAUSA</Text></Pressable>
        <Text style={styles.mutedCenter}>ⓘ Você pode cancelar a pausa a qualquer momento.</Text>
      </View>
    </View>
  </Modal>
}

function Streak({setScreen}) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Header title="STREAK" onBack={()=>setScreen("home")} right={<Ionicons name="flame-outline" size={27} color={PURPLE}/>} />
    <View style={styles.streakCircle}><Text style={{fontSize:74}}>🔥</Text><Text style={styles.streakNumber}>3</Text><Text style={styles.streakDays}>dias atuais</Text></View>
    <Text style={styles.centerTitle}>Continue assim!</Text><Text style={styles.mutedCenter}>Complete sua meta diária para manter o streak.</Text>
    <InfoCard icon="trophy-outline" title="MELHOR SEQUÊNCIA"><Text style={styles.bigCardText}>12 dias</Text><Text style={styles.muted}>Alcançado em Jun 2024</Text></InfoCard>
    <InfoCard icon="shield-outline" title="SAVE POINTS"><Text style={styles.bigCardText}>1 / 5</Text><Text style={styles.muted}>1 disponível</Text><Text style={{fontSize:34,letterSpacing:7,color:PURPLE,marginTop:14}}>⬡ ◇ ◇ ◇ ◇</Text><Text style={styles.muted}>+1 Save Point por semana (máx. 5)</Text></InfoCard>
    <InfoCard icon="gift-outline" title="PRÓXIMA RECOMPENSA"><Text style={styles.bigCardText}>7 dias  •  Chama</Text><ProgressBar value={3} max={7}/><Text style={styles.muted}>Faltam 4 dias para a próxima recompensa</Text></InfoCard>
    <InfoCard icon="flame-outline" title="RECOMPENSAS">
      {["3 dias  •  Faísca","7 dias  •  Chama","14 dias  •  Fogo","30 dias  •  Incêndio","60 dias  •  Forjado"].map((x,i)=><View style={styles.rewardLine} key={x}><Text style={styles.rewardName}>{x}</Text><Ionicons name={i===0?"checkmark-circle":"lock-closed"} size={18} color={i===0?GREEN:MUTED}/></View>)}
    </InfoCard>
  </ScrollView><BottomNav active="streak" setScreen={setScreen}/></SafeAreaView>
}

function InfoCard({icon,title,children}) {
 return <View style={styles.infoCard}><View style={{flexDirection:"row",alignItems:"center",gap:10}}><Ionicons name={icon} size={25} color={PURPLE}/><Text style={styles.cardLabel}>{title}</Text></View>{children}</View>
}

function Character({setScreen,coins}) {
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
   <View style={styles.topRow}><Pressable style={styles.iconButton}><Ionicons name="menu" size={27} color={WHITE}/></Pressable><Text style={styles.headerTitle}>PERSONAGEM</Text><Coin value={coins}/></View>
   <Pressable onPress={()=>setScreen("editor")} style={styles.characterPortrait}><Image source={avatar} style={styles.characterImage}/></Pressable>
   <Text style={styles.characterName}>Neroth</Text><Text style={styles.characterClass}><Text style={{color:PURPLE}}>Nível 8</Text> • Guerreiro</Text>
   <Text style={styles.centerXP}>620 / 1.200 XP</Text><ProgressBar value={620} max={1200}/>
   <Text style={styles.sectionTitle}>ATRIBUTOS</Text>
   <Attribute title="Corpo" value={72} color={PURPLE} icon="arm-flex-outline"/>
   <Attribute title="Mente" value={61} color={BLUE} icon="brain"/>
   <Attribute title="Espírito" value={54} color="#A858FF" icon="creation"/>
   <View style={styles.titleCard}><Ionicons name="trophy-outline" size={33} color={PURPLE}/><View style={{flex:1}}><Text style={styles.cardLabel}>TÍTULO ATUAL</Text><Text style={styles.titleName}>Persistente</Text><Text style={styles.muted}>Concedido por manter seu caminho.</Text></View><Text style={{fontSize:50}}>✦</Text></View>
   <Pressable onPress={()=>setScreen("editor")} style={styles.editRow}><Ionicons name="person-circle-outline" size={30} color={PURPLE}/><Text style={styles.taskTitle}>Personalizar avatar</Text><Ionicons name="chevron-forward" size={25} color={PURPLE}/></Pressable>
 </ScrollView><BottomNav active="character" setScreen={setScreen}/></SafeAreaView>
}

function Attribute({title,value,color,icon}) {
 return <View style={[styles.attribute,{borderColor:color+"55"}]}><View style={[styles.attrIcon,{borderColor:color+"88"}]}><MaterialCommunityIcons name={icon} size={27} color={color}/></View><View style={{flex:1}}><Text style={[styles.attrTitle,{color}]}>{title}</Text><ProgressBar value={value} max={100} color={color}/></View><View><Text style={[styles.attrValue,{color}]}>{value}</Text><Text style={styles.muted}>/ 100</Text></View></View>
}

function Shop({setScreen,coins,setCoins}) {
 const [tab,setTab]=useState("rewards");
 const [cat,setCat]=useState("MOLDURA");
 const [owned,setOwned]=useState(cosmetics);
 const buy = (r) => { if(coins>=r[3]) setCoins(coins-r[3]); };
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
   <Header title="LOJA" onBack={()=>setScreen("home")} right={<Coin value={coins}/>}/>
   <View style={styles.shopTabs}>{["RECOMPENSAS","MEUS ITENS"].map((x,i)=><Pressable key={x} onPress={()=>setTab(i===0?"rewards":"items")} style={[styles.shopTab,tab===(i===0?"rewards":"items")&&styles.shopTabActive]}><Text style={styles.shopTabText}>{x}</Text></Pressable>)}</View>
   {tab==="rewards" ? <><SectionTitle title="🎁  RECOMPENSAS"/><Text style={styles.muted}>Troque suas moedas por recompensas reais e desfrute de merecidos momentos.</Text><View style={styles.rewardGrid}>{rewards.map(r=><View style={styles.rewardCard} key={r[1]}><Text style={styles.rewardArt}>{r[0]}</Text><Text style={styles.rewardTitle}>{r[1]}</Text><Text style={styles.rewardDesc}>{r[2]}</Text><Text style={styles.price}>🪙 {r[3]}</Text><Pressable onPress={()=>buy(r)} style={styles.smallButton}><Text style={styles.smallButtonText}>RESGATAR</Text></Pressable></View>)}</View></> :
   <><SectionTitle title="MEUS ITENS"/><View style={styles.categoryRow}>{["MOLDURA","AURAS","EFEITOS","OUTROS"].map(c=><Pressable key={c} onPress={()=>setCat(c)} style={[styles.category,cat===c&&styles.categoryActive]}><Text style={styles.categoryText}>{c}</Text></Pressable>)}</View><View style={styles.cosmeticGrid}>{owned.filter(x=>x.cat===cat).map(c=><CosmeticCard item={c} setOwned={setOwned} key={c.id}/>)}</View></>}
 </ScrollView><BottomNav active="shop" setScreen={setScreen}/></SafeAreaView>
}

function CosmeticCard({item,setOwned}) {
 const equip=()=>setOwned(cs=>cs.map(c=>c.cat===item.cat?{...c,equipped:c.id===item.id}:c));
 return <View style={[styles.cosmeticCard,item.equipped&&styles.cosmeticEquipped]}><Text style={styles.cosmeticIcon}>{item.icon}</Text><Text style={styles.cosmeticCat}>{item.cat}</Text><Text style={styles.cosmeticName}>{item.name}</Text>{item.equipped?<Text style={styles.equippedText}>Equipado</Text>:<Pressable onPress={equip} style={styles.smallButton}><Text style={styles.smallButtonText}>EQUIPAR</Text></Pressable>}</View>
}

function Bosses({setScreen}) {
 const [dead,setDead]=useState(false); const [detail,setDetail]=useState(false);
 const active=[["A INÉRCIA","650 / 1000","65%","3 / 5 etapas","👤"],["A DISTRAÇÃO","60%","60%","2 / 4 etapas","📺"],["O CAOS","30%","30%","1 / 5 etapas","👹"],["A PRESSA","80%","80%","4 / 5 etapas","⏳"]];
 const defeated=[["A DISTRAÇÃO","Derrotado há 6 dias","📺"],["O CAOS","Derrotado há 12 dias","👹"],["A PRESSA","Derrotado há 19 dias","⏳"],["A INSEGURANÇA","Derrotado há 26 dias","👤"],["O EXCESSO","Derrotado há 33 dias","🌀"]];
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
  <Header title="☠  BOSSES" onBack={()=>setScreen("home")} right={<Ionicons name="help-circle-outline" size={28} color={WHITE}/>}/>
  <View style={styles.segment}><Pressable onPress={()=>setDead(false)} style={[styles.segmentBtn,!dead&&styles.segmentActive]}><Text style={styles.segmentText}>⚔  ATIVOS</Text></Pressable><Pressable onPress={()=>setDead(true)} style={[styles.segmentBtn,dead&&styles.segmentActive]}><Text style={styles.segmentText}>☠  DERROTADOS</Text></Pressable></View>
  {!dead ? <><SectionTitle title="BOSS PRINCIPAL"/><Pressable style={styles.mainBoss} onPress={()=>setDetail(true)}><View style={styles.mainBossArt}><Text style={{fontSize:76}}>👤</Text></View><View style={{flex:1}}><Text style={styles.mainBossName}>A INÉRCIA</Text><Text style={styles.muted}>Quanto mais você adia, mais forte eu fico.</Text><Text style={styles.bossStat}>HP <Text style={{color:WHITE}}>650 / 1000</Text></Text><ProgressBar value={650} max={1000}/><Text style={styles.muted}>⚑ 3 / 5 etapas   ◷ Ativo há 4 dias</Text></View></Pressable><SectionTitle title="OUTROS BOSSES"/>{active.slice(1).map(b=><BossRow key={b[0]} b={b}/>)}</> :
   <>{defeated.map(b=><Pressable key={b[0]} onPress={()=>setDetail(true)} style={styles.defeatedRow}><View style={styles.bossThumb}><Text style={{fontSize:35}}>{b[2]}</Text></View><View style={{flex:1}}><Text style={styles.defeatedName}>{b[0]}</Text><Text style={{color:"#9B57E7"}}>{b[1]}</Text></View><Ionicons name="chevron-forward" size={28} color={PURPLE}/></Pressable>)}<Pressable style={styles.secretRow}><Text style={{fontSize:42}}>❔</Text><View><Text style={styles.defeatedName}>???</Text><Text style={{color:"#9B57E7"}}>BOSS SECRETO</Text></View></Pressable></>}
 </ScrollView><BottomNav active="bosses" setScreen={setScreen}/><BossDetail visible={detail} onClose={()=>setDetail(false)}/></SafeAreaView>
}

function BossRow({b}) { return <View style={styles.bossRow}><View style={styles.bossThumb}><Text style={{fontSize:38}}>{b[4]}</Text></View><View style={{flex:1}}><Text style={styles.bossRowName}>{b[0]}</Text><Text style={styles.bossStat}>HP <Text style={{color:WHITE}}>{b[1]}</Text></Text><ProgressBar value={parseFloat(b[2])} max={100}/><Text style={styles.muted}>{b[3]}   ◷ Ativo</Text></View><Ionicons name="chevron-forward" size={28} color={PURPLE}/></View>}

function BossDetail({visible,onClose}) { return <Modal visible={visible} transparent animationType="fade"><View style={styles.modalBackdrop}><View style={styles.bossModal}><Pressable onPress={onClose} style={styles.modalClose}><Ionicons name="close" size={28} color={PURPLE}/></Pressable><View style={styles.bossThumb}><Text style={{fontSize:48}}>📺</Text></View><Text style={styles.modalTitle}>A DISTRAÇÃO</Text><Text style={styles.muted}>Você se liberta das distrações que te afastavam do foco.</Text><View style={styles.infoBox}><Text style={styles.infoText}>⚑  Etapas concluídas                         5 / 5</Text><Text style={styles.infoText}>🎁  Recompensa                    +80 XP  •  +40 🪙</Text><Text style={styles.infoText}>⚔  Derrotado em                         22/08/2026</Text></View><Pressable onPress={onClose} style={styles.primaryButton}><Text style={styles.primaryText}>Fechar</Text></Pressable></View></View></Modal>}

function History({setScreen}) {
 const entries=[["19:42","Task concluída","Beber 2L de água","+10 XP","+5 🪙","green"],["18:15","Etapa concluída","A Inércia – Etapa 3","+15 XP","+8 🪙","purple"],["16:20","Recompensa resgatada","1h de videogame","-20 🪙","","red"],["14:08","Subiu de nível","Você alcançou o nível 7","+50 XP","+25 🪙","blue"],["10:33","Task concluída","Treinar 30 minutos","+15 XP","+7 🪙","green"],["22:04","Boss derrotado","A Procrastinação","+200 XP","+40 🪙","purple"]];
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}><Header title="HISTÓRICO" onBack={()=>setScreen("home")} right={<Ionicons name="information-circle-outline" size={26} color={MUTED}/>}/><View style={styles.historyTabs}>{["TODOS","TASKS","BOSSES","RECOMPENSAS"].map((x,i)=><View key={x} style={[styles.historyTab,i===0&&styles.historyActive]}><Text style={styles.historyTabText}>{x}</Text></View>)}</View><Text style={styles.date}>29 DE AGOSTO DE 2025</Text>{entries.map((e,i)=><View key={i} style={styles.historyRow}><Text style={styles.time}>{e[0]}</Text><View style={styles.historyIcon}><Ionicons name={e[5]==="green"?"checkmark":e[5]==="red"?"gift-outline":e[5]==="blue"?"arrow-up":"flash"} size={23} color={e[5]==="green"?GREEN:e[5]==="red"?RED:e[5]==="blue"?BLUE:PURPLE}/></View><View style={{flex:1}}><Text style={styles.historyTitle}>{e[1]}</Text><Text style={styles.muted}>{e[2]}</Text></View><View><Text style={[styles.historyXP,{color:e[5]==="red"?RED:e[5]==="green"?GREEN:PURPLE}]}>{e[3]}</Text><Text style={{color:e[5]==="red"?RED:GOLD}}>{e[4]}</Text></View></View>)}</ScrollView><BottomNav active="" setScreen={setScreen}/></SafeAreaView>
}

function Editor({setScreen,coins}) {
 const [cat,setCat]=useState("TODOS"); const [items,setItems]=useState(cosmetics);
 const cats=["TODOS","CABELO","OLHOS","TRAJES","AURAS","ACESSÓRIOS"];
 const visible=cat==="TODOS"?items:items.filter(x=>x.cat===cat);
 const equip=(id)=>setItems(xs=>xs.map(x=>x.cat===items.find(i=>i.id===id)?.cat?{...x,equipped:x.id===id}:x));
 return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
   <View style={styles.topRow}><Pressable onPress={()=>setScreen("character")} style={styles.iconButton}><Ionicons name="chevron-back" size={28} color={WHITE}/></Pressable><Text style={styles.headerTitle}>EDITAR AVATAR</Text><Coin value={coins}/></View>
   <Text style={styles.editorSubtitle}>Personalize seu guerreiro</Text>
   <View style={styles.editorAvatarWrap}><Image source={avatar} style={styles.editorAvatar}/></View>
   <Text style={styles.characterName}>Neroth</Text><Text style={styles.characterClass}><Text style={{color:PURPLE}}>Nível 8</Text> • Guerreiro</Text>
   <View style={styles.editorActions}><Pressable style={styles.miniAction}><Ionicons name="refresh" size={20} color={MUTED}/><Text style={styles.muted}>Redefinir</Text></Pressable><Pressable style={styles.miniAction}><Ionicons name="dice-outline" size={20} color={MUTED}/><Text style={styles.muted}>Aleatório</Text></Pressable></View>
   <View style={styles.categoryScroll}>{cats.map(c=><Pressable key={c} onPress={()=>setCat(c)} style={[styles.editorCat,cat===c&&styles.editorCatActive]}><Text style={[styles.editorCatText,cat===c&&{color:"#B56AFF"}]}>{c}</Text></Pressable>)}</View>
   <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>SEUS COSMÉTICOS</Text><Text style={styles.sectionAction}>Equipado: 4/5</Text></View>
   <View style={styles.cosmeticGrid}>{visible.map(x=><View key={x.id} style={[styles.cosmeticCard,x.equipped&&styles.cosmeticEquipped]}><View style={styles.cosmeticArt}><Text style={{fontSize:48}}>{x.icon}</Text></View><Text style={styles.cosmeticCat}>{x.cat}</Text><Text style={styles.cosmeticName}>{x.name}</Text>{x.equipped?<Text style={styles.equippedText}>✓ Equipado</Text>:x.owned?<Pressable onPress={()=>equip(x.id)} style={styles.smallButton}><Text style={styles.smallButtonText}>EQUIPAR</Text></Pressable>:<View style={styles.lockBadge}><Ionicons name="lock-closed" size={18} color={WHITE}/></View>}</View>)}</View>
   <View style={styles.setBonus}><Ionicons name="sparkles-outline" size={32} color={PURPLE}/><View style={{flex:1}}><Text style={styles.sectionTitle}>BÔNUS DE CONJUNTO</Text><Text style={styles.muted}>Equipe 3 ou mais itens da mesma coleção para ganhar bônus exclusivos!</Text></View><Text style={styles.sectionAction}>1/3</Text></View>
 </ScrollView><BottomNav active="character" setScreen={setScreen}/></SafeAreaView>
}

export default function App() {
 const [screen,setScreen]=useState("home");
 const [coins,setCoins]=useState(128);
 const props={setScreen,coins,setCoins};
 return <><StatusBar barStyle="light-content" backgroundColor={BG}/>{
   screen==="home"?<Home {...props}/>:
   screen==="streak"?<Streak {...props}/>:
   screen==="character"?<Character {...props}/>:
   screen==="shop"?<Shop {...props}/>:
   screen==="bosses"?<Bosses {...props}/>:
   screen==="history"?<History {...props}/>:
   <Editor {...props}/>
 }</>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:BG},
 page:{paddingHorizontal:22,paddingTop:14,paddingBottom:105},
 topRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:18},
 header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:18},
 headerTitle:{fontSize:25,fontWeight:"900",letterSpacing:1,color:WHITE},
 iconButton:{width:54,height:54,borderRadius:15,borderWidth:1,borderColor:BORDER,alignItems:"center",justifyContent:"center",backgroundColor:"#080812"},
 coinPill:{flexDirection:"row",alignItems:"center",gap:7,borderWidth:1,borderColor:"#302747",borderRadius:25,paddingHorizontal:15,paddingVertical:9,backgroundColor:"#080812"},
 coinText:{color:WHITE,fontSize:19,fontWeight:"800"},
 profileRow:{flexDirection:"row",alignItems:"center",marginTop:7},
 avatarSmallWrap:{width:126,height:126,borderRadius:63,borderWidth:2,borderColor:PURPLE,overflow:"hidden",backgroundColor:"#10061B"},
 avatarSmall:{width:"100%",height:"100%",resizeMode:"cover"},
 name:{fontSize:32,fontWeight:"900",color:WHITE,letterSpacing:1},
 subtitle:{fontSize:15,color:"#A29BBF",marginTop:4},
 xpRow:{flexDirection:"row",justifyContent:"space-between",marginTop:22,marginBottom:8},
 muted:{color:MUTED,fontSize:14},
 progressTrack:{height:14,backgroundColor:"#171426",borderRadius:10,overflow:"hidden",marginVertical:7},
 progressFill:{height:"100%",borderRadius:10},
 statRow:{flexDirection:"row",gap:9,marginTop:17},
 statCard:{flex:1,minHeight:135,borderRadius:18,borderWidth:1,borderColor:BORDER,backgroundColor:CARD,padding:15,alignItems:"center"},
 statLabel:{fontSize:12,color:"#B2A9C8",marginTop:8},
 statValue:{fontSize:27,fontWeight:"900",color:WHITE,marginTop:9},
 sectionTitleRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:27,marginBottom:12},
 sectionTitle:{fontSize:17,fontWeight:"800",letterSpacing:1,color:"#BCAFD0"},
 sectionAction:{color:"#B25AFF",fontWeight:"800"},
 task:{minHeight:62,borderWidth:1,borderColor:BORDER,backgroundColor:CARD,borderRadius:14,marginBottom:7,paddingHorizontal:12,flexDirection:"row",alignItems:"center"},
 checkbox:{width:28,height:28,borderRadius:6,borderWidth:2,borderColor:"#9B6BFF",alignItems:"center",justifyContent:"center",marginRight:13},
 checkboxDone:{backgroundColor:PURPLE,borderColor:PURPLE},
 taskTitle:{color:WHITE,fontSize:16,flex:1},
 taskXP:{color:"#B05AFF",fontWeight:"800",marginRight:12},
 bossHome:{borderWidth:1,borderColor:BORDER,backgroundColor:CARD,borderRadius:18,padding:17,flexDirection:"row",gap:15,alignItems:"center"},
 bossIcon:{width:72,height:72,borderRadius:18,borderWidth:1,borderColor:"#7B2B66",alignItems:"center",justifyContent:"center",backgroundColor:"#130A18"},
 bossTitle:{fontSize:20,fontWeight:"900",color:WHITE,marginBottom:4},
 pauseLink:{alignSelf:"center",padding:15,flexDirection:"row"},
 bottomNav:{position:"absolute",bottom:0,left:0,right:0,height:78,borderTopWidth:1,borderTopColor:BORDER,backgroundColor:"#07070F",flexDirection:"row",paddingBottom:5},
 navItem:{flex:1,alignItems:"center",justifyContent:"center",gap:3},
 navActive:{backgroundColor:"#130A24",borderRadius:12,margin:5},
 navLabel:{fontSize:10,fontWeight:"700",color:MUTED},
 centerTitle:{color:WHITE,fontSize:21,fontWeight:"800",textAlign:"center",marginTop:20},
 mutedCenter:{color:MUTED,fontSize:14,textAlign:"center",lineHeight:21,marginTop:7},
 streakCircle:{alignSelf:"center",width:270,height:270,borderRadius:135,borderWidth:10,borderColor:"#7B2BEA",alignItems:"center",justifyContent:"center",backgroundColor:"#080710",marginTop:10},
 streakNumber:{fontSize:58,color:WHITE,fontWeight:"900",marginTop:-12},
 streakDays:{fontSize:15,color:MUTED},
 infoCard:{borderWidth:1,borderColor:BORDER,borderRadius:17,backgroundColor:CARD,padding:18,marginTop:16},
 cardLabel:{color:"#9E96B8",fontSize:14,fontWeight:"700",letterSpacing:.5},
 bigCardText:{color:WHITE,fontSize:23,fontWeight:"800",marginTop:12,marginBottom:3},
 rewardLine:{flexDirection:"row",justifyContent:"space-between",paddingVertical:12,borderBottomWidth:1,borderBottomColor:"#19182A"},
 rewardName:{color:"#C0B8D0",fontSize:14},
 characterPortrait:{alignSelf:"center",width:335,height:335,borderRadius:170,borderWidth:3,borderColor:"#A754FF",overflow:"hidden",backgroundColor:"#0A0612"},
 characterImage:{width:"100%",height:"100%",resizeMode:"cover"},
 characterName:{color:WHITE,fontSize:36,fontWeight:"900",textAlign:"center",marginTop:9},
 characterClass:{color:"#B0A8BE",fontSize:18,textAlign:"center",marginTop:3},
 centerXP:{color:"#B36BFF",fontSize:17,fontWeight:"800",textAlign:"center",marginTop:10},
 attribute:{minHeight:100,borderWidth:1,borderRadius:17,backgroundColor:CARD,padding:16,flexDirection:"row",alignItems:"center",gap:14,marginTop:9},
 attrIcon:{width:58,height:58,borderRadius:30,borderWidth:1,alignItems:"center",justifyContent:"center"},
 attrTitle:{fontSize:18,fontWeight:"800",marginBottom:5},
 attrValue:{fontSize:32,fontWeight:"900",textAlign:"right"},
 titleCard:{borderWidth:1,borderColor:BORDER,borderRadius:17,backgroundColor:CARD,padding:17,flexDirection:"row",alignItems:"center",gap:13,marginTop:15},
 titleName:{color:"#A84FFF",fontSize:25,fontWeight:"900",marginTop:3},
 editRow:{borderWidth:1,borderColor:BORDER,borderRadius:17,backgroundColor:CARD,padding:17,flexDirection:"row",alignItems:"center",gap:13,marginTop:10},
 shopTabs:{flexDirection:"row",borderWidth:1,borderColor:BORDER,borderRadius:17,overflow:"hidden",marginBottom:10},
 shopTab:{flex:1,paddingVertical:14,alignItems:"center"},
 shopTabActive:{backgroundColor:"#281043",borderBottomWidth:2,borderBottomColor:PURPLE},
 shopTabText:{color:WHITE,fontWeight:"800"},
 rewardGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:15},
 rewardCard:{width:"48%",borderWidth:1,borderColor:BORDER,borderRadius:14,backgroundColor:CARD,padding:12,minHeight:260},
 rewardArt:{fontSize:54,textAlign:"center",marginVertical:10},
 rewardTitle:{color:WHITE,fontSize:16,fontWeight:"800",textAlign:"center"},
 rewardDesc:{color:MUTED,fontSize:12,textAlign:"center",lineHeight:17,marginTop:7,minHeight:52},
 price:{color:WHITE,fontSize:17,fontWeight:"800",textAlign:"center",marginVertical:9},
 smallButton:{backgroundColor:"#3A1267",borderWidth:1,borderColor:"#8E3BFF",borderRadius:8,paddingVertical:9,alignItems:"center",marginTop:4},
 smallButtonText:{color:WHITE,fontWeight:"800",fontSize:12},
 categoryRow:{flexDirection:"row",borderWidth:1,borderColor:BORDER,borderRadius:14,overflow:"hidden",marginTop:15},
 category:{flex:1,paddingVertical:12,alignItems:"center"},
 categoryActive:{backgroundColor:"#2A0C45"},
 categoryText:{color:MUTED,fontSize:11,fontWeight:"800"},
 cosmeticGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginTop:15},
 cosmeticCard:{width:"48%",borderWidth:1,borderColor:BORDER,borderRadius:14,backgroundColor:CARD,padding:12,minHeight:200,alignItems:"center",justifyContent:"space-between"},
 cosmeticEquipped:{borderColor:"#A04EFF",backgroundColor:"#100A1B"},
 cosmeticArt:{height:90,justifyContent:"center"},
 cosmeticIcon:{fontSize:55,color:PURPLE,textAlign:"center"},
 cosmeticCat:{fontSize:10,color:"#9C6BDB",fontWeight:"800"},
 cosmeticName:{color:WHITE,fontSize:15,fontWeight:"700",textAlign:"center"},
 equippedText:{color:"#A95AFF",fontWeight:"800"},
 lockBadge:{position:"absolute",top:65,left:"43%",backgroundColor:"#2A2A35",borderRadius:20,padding:8},
 segment:{flexDirection:"row",borderWidth:1,borderColor:BORDER,borderRadius:30,padding:2,marginBottom:18},
 segmentBtn:{flex:1,paddingVertical:13,alignItems:"center",borderRadius:26},
 segmentActive:{backgroundColor:"#6D29C8"},
 segmentText:{color:WHITE,fontWeight:"800"},
 mainBoss:{borderWidth:1,borderColor:"#8E42F7",borderRadius:20,backgroundColor:CARD,padding:13,flexDirection:"row",gap:14},
 mainBossArt:{width:135,height:210,borderRadius:16,backgroundColor:"#130C24",alignItems:"center",justifyContent:"center"},
 mainBossName:{color:WHITE,fontSize:30,fontWeight:"900",marginBottom:5},
 bossStat:{color:PURPLE,fontSize:17,fontWeight:"800",marginTop:15},
 bossRow:{borderWidth:1,borderColor:BORDER,borderRadius:18,backgroundColor:CARD,padding:12,flexDirection:"row",alignItems:"center",gap:12,marginBottom:10},
 bossThumb:{width:92,height:92,borderRadius:12,borderWidth:1,borderColor:"#6331A5",backgroundColor:"#100B19",alignItems:"center",justifyContent:"center"},
 bossRowName:{color:WHITE,fontSize:21,fontWeight:"900",marginBottom:6},
 defeatedRow:{borderWidth:1,borderColor:BORDER,borderRadius:17,backgroundColor:CARD,padding:12,flexDirection:"row",alignItems:"center",gap:14,marginBottom:9},
 defeatedName:{color:WHITE,fontSize:22,fontWeight:"800"},
 secretRow:{borderWidth:1,borderColor:BORDER,borderRadius:17,backgroundColor:"#08080E",padding:15,flexDirection:"row",alignItems:"center",gap:18,marginTop:5},
 historyTabs:{flexDirection:"row",borderWidth:1,borderColor:BORDER,borderRadius:14,overflow:"hidden",marginBottom:18},
 historyTab:{flex:1,paddingVertical:12,alignItems:"center"},
 historyActive:{backgroundColor:"#271052"},
 historyTabText:{color:"#A9A2B8",fontSize:11,fontWeight:"800"},
 date:{color:"#7780A4",fontWeight:"800",marginVertical:10},
 historyRow:{minHeight:83,borderWidth:1,borderColor:BORDER,borderRadius:14,backgroundColor:CARD,padding:12,flexDirection:"row",alignItems:"center",gap:10,marginBottom:8},
 time:{color:"#7E7890",fontSize:12,width:42},
 historyIcon:{width:45,height:45,borderRadius:25,borderWidth:1,borderColor:"#4A315E",alignItems:"center",justifyContent:"center"},
 historyTitle:{color:WHITE,fontSize:15,fontWeight:"800",marginBottom:4},
 historyXP:{fontSize:15,fontWeight:"900",textAlign:"right"},
 editorSubtitle:{color:MUTED,textAlign:"center",marginTop:-10,marginBottom:10},
 editorAvatarWrap:{alignSelf:"center",width:330,height:330,borderRadius:165,borderWidth:3,borderColor:"#A955FF",overflow:"hidden",backgroundColor:"#0D0716",marginTop:2},
 editorAvatar:{width:"100%",height:"100%",resizeMode:"cover"},
 editorActions:{flexDirection:"row",justifyContent:"center",gap:14,marginVertical:12},
 miniAction:{borderWidth:1,borderColor:BORDER,borderRadius:12,padding:10,alignItems:"center",gap:4,minWidth:100},
 categoryScroll:{flexDirection:"row",borderWidth:1,borderColor:BORDER,borderRadius:15,overflow:"hidden",marginTop:4},
 editorCat:{paddingVertical:12,paddingHorizontal:10,alignItems:"center"},
 editorCatActive:{backgroundColor:"#2B0E48"},
 editorCatText:{color:MUTED,fontSize:10,fontWeight:"800"},
 setBonus:{borderWidth:1,borderColor:"#6432A5",borderRadius:15,backgroundColor:"#0D0917",padding:15,flexDirection:"row",gap:12,alignItems:"center",marginTop:18},
 modalBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,.82)",justifyContent:"center",padding:18},
 pauseModal:{borderWidth:1,borderColor:"#6C934E",backgroundColor:"#070B08",borderRadius:24,padding:22,alignItems:"center",maxHeight:"90%"},
 bossModal:{borderWidth:1,borderColor:"#7135B5",backgroundColor:"#0A0811",borderRadius:22,padding:22},
 modalClose:{position:"absolute",right:13,top:12,zIndex:2},
 modalTitle:{color:WHITE,fontSize:28,fontWeight:"900",textAlign:"center",letterSpacing:2,marginTop:10},
 modalLead:{color:WHITE,fontSize:18,textAlign:"center",marginTop:14,lineHeight:25},
 infoBox:{borderWidth:1,borderColor:BORDER,borderRadius:14,padding:12,marginTop:18,width:"100%"},
 infoLine:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#191A20"},
 infoText:{color:"#C4BFD0",fontSize:14,flex:1},
 greenSmall:{color:"#8ED15F",fontWeight:"800",alignSelf:"flex-start",marginTop:18},
 durationRow:{flexDirection:"row",gap:5,marginTop:9,marginBottom:15},
 duration:{borderWidth:1,borderRadius:10,padding:9,flex:1,minHeight:58,alignItems:"center",justifyContent:"center"},
 durationText:{color:"#BDB6C8",fontSize:9,fontWeight:"700",textAlign:"center"},
 primaryButton:{width:"100%",borderWidth:1,borderColor:PURPLE,borderRadius:12,paddingVertical:13,alignItems:"center",marginTop:12,backgroundColor:"#1C0D2E"},
 primaryText:{color:"#B969FF",fontWeight:"900",fontSize:16}
});
