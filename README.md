## COMPLEXO MARTE - TRABALHO FINAL DE COMPUTAÇÃO GRÁFICA

Este projeto simula uma colônia humana em Marte, focada na exploração de elementos procedurais, complexidade de cena (múltiplos objetos), iluminação avançada e sistema de animação de estados (Máquina de Estados).

O jogo utiliza a biblioteca **Three.js** e o modelo de carregamento por módulos.

---

### CONTROLES DO ALIEN (PLAYER)

A navegação e interação do personagem são feitas através de um sistema de controle de terceira pessoa e comandos específicos que ativam as mecânicas únicas do mapa:

| Tecla | Ação | Detalhes da Mecânica |
| :---: | :--- | :--- |
| **W, S** | Mover para Frente/Trás | Translaciona o personagem no eixo Z. |
| **A, D** | Virar para Esquerda/Direita | Rotaciona o personagem no eixo Y. |
| **B** | **Animação de Dança** | **Toggle (Liga/Desliga):** Ativa a animação de dança. Se o personagem andar, a dança é interrompida. |
| **C** | **Chamar Metrô** / **Freio de mão** | **Teletransporte de Aproximação:** Encontra o metrô mais próximo na linha do jogador, teletransporta-o para 30m de distância e o faz frear suavemente na frente do personagem / Faz o metrô andar/parar |
| **E** | **Embarcar / Desembarcar** | Permite ao personagem "surfar" no teto do vagão do metrô para viajar entre as estações. (Necessário estar próximo e o trem estar parado ou lento). |

---

### 2. VISÃO GERAL DO MAPA E RECURSOS

O cenário é um mapa vasto, mas compactado em Distritos (Cidades) conectados pela ferrovia.

#### 2.1 Estrutura e População (Complexidade)
* **Colônia em Distritos:** O mapa é dividido em 5 grandes distritos (Centro, Norte, Sul, Leste e Oeste) que servem como estações e postos avançados. A proximidade permite que o jogador explore a pé.
* **Hangar Principal:** Localizado no centro (0,0,0), serve como ponto de partida e contém o Hangar Central (Hero Asset).
* **População Dinâmica:** Mais de **30 NPCs** (Guardas e Equipe de Apoio) são gerados, incluindo um esquadrão de elite no centro e guardas em duplas nas bases externas. Os NPCs usam uma animação de **Idle específica** para os guardas.
* **Geração Procedural:** Mais de 300 rochas são espalhadas aleatoriamente, com variações de escala, dando um toque orgânico ao terreno.

#### 2.2 Animação e Cenário
* **Sistema de Metrô Completo:** Implementado com duas linhas duplas (ida e volta) que se cruzam (Eixo X e Eixo Z). Possui uma frota de **8 Metrôs** que circulam continuamente em loop.
* **Máquina de Estados:** O personagem Player gerencia a prioridade das animações (`Walk` > `Dance` > `Idle`).
* **Exclusão Geométrica:** O código utiliza verificações de distância para garantir que nenhuma base, NPC ou rocha nasça dentro do **Hangar** central ou **sobre os trilhos**.
* **Elementos de Impacto:** Nave espacial gigante, Radar rotativo, Montanhas no horizonte (criadas escalando rochas) e Postes de luz neon que iluminam a área.

---

### 3. ARQUIVOS 

Para o código funcionar corretamente, todos os seguintes arquivos devem estar na pasta `assets/marte/`:

* **Modelos de Cena (.obj):**
    * `base_marte.obj`
    * `rocha.obj`
    * `hangar.obj`
    * `nave.obj`
    * `radar.obj`
    * `rover.obj`
    * `barrel.obj` (ou o sistema usará um cilindro procedural)
    * `caixa.obj` (ou o sistema usará um cubo procedural)
* **Personagens (.fbx):**
    * `personagem.fbx` 
    * `npc.fbx` 
* **Animações (.fbx):**
    * `anim_walk.fbx`
    * `anim_dance.fbx`
    * `anim_idle.fbx`
    * `npc_idle.fbx` 
