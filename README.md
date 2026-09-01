# Ascensão 0.1

Projeto Expo/React Native da versão 0.1 do app Ascensão.

## O que já está implementado

- Home funcional com tarefas clicáveis e XP.
- Streak.
- Personagem com atributos.
- Editor de avatar acessível pela Home e pela tela Personagem.
- Loja de recompensas.
- Loja/Meus Itens com cosméticos e botão EQUIPAR.
- Bosses ativos e derrotados.
- Modal de detalhes do boss.
- Histórico.
- Modal de Modo Pausa.
- Navegação inferior entre as áreas principais.
- Estado local para moedas, tarefas e equipamentos.

## Visual

A pasta `references/` contém as referências visuais fornecidas para manter a implementação fiel ao conceito definido.

## Rodar localmente

```bash
npm install
npx expo start
```

## Gerar APK no GitHub

1. Crie um projeto/repositório no GitHub.
2. Envie os arquivos desta pasta.
3. Em GitHub > Settings > Secrets and variables > Actions, crie `EXPO_TOKEN`.
4. Rode o workflow `Build Android APK`.
5. O EAS fará o build do APK.

> O `EXPO_TOKEN` é necessário para o EAS Build. Não coloque o token dentro do código.
