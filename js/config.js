/* =====================================================================
   CONFIGURAÇÃO — Quem Vai Sobreviver? (corrida de bicicleta)
   ===================================================================== */
window.CONFIG = {
  /* Cole aqui a config do app Web do seu projeto Firebase (Realtime Database).
     Enquanto estiver null, o jogo roda em MODO LOCAL: abra o site em duas abas
     do mesmo navegador para testar os dois jogadores. Exemplo:
     firebase: {
       apiKey: "AIza...",
       authDomain: "seu-projeto.firebaseapp.com",
       databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
       projectId: "seu-projeto",
       storageBucket: "seu-projeto.firebasestorage.app",
       messagingSenderId: "...",
       appId: "..."
     },
  */
  firebase: {
    apiKey: "AIzaSyB-fASAZEn6Av2FOqSgug-DjQLUzfv979w",
    authDomain: "ciclismo-rs.firebaseapp.com",
    // endereço padrão do Realtime Database. Se ao criar o banco você escolheu outra
    // região, copie o endereço que aparece no topo da aba "Dados" e cole aqui.
    databaseURL: "https://ciclismo-rs-default-rtdb.firebaseio.com",
    projectId: "ciclismo-rs",
    storageBucket: "ciclismo-rs.firebasestorage.app",
    messagingSenderId: "112551253563",
    appId: "1:112551253563:web:8ac9d0d0772130e4af6e1e"
  },

  /* Pasta do Realtime Database onde a sala fica guardada */
  caminho: "corrida-bicicleta/sala",

  /* ROTEIRO: quem ganha e quem chega na final com ele (nomes iguais aos de corredores.js) */
  vencedor: "Jazzghost",
  vice: "Torajo",

  /* Ficam até bem tarde na corrida (o primeiro da lista sai antes do segundo) */
  resistentes: ["Alexey", "Problems"]
};
