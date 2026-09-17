export interface DialogueData {
  npcName: string;
  lines: string[];
  questId?: string;
}

export const DIALOGUES: Record<string, DialogueData> = {
  npc_herrero: {
    npcName: 'Maestro Herrero Garan',
    lines: [
      '¡Saludos, viajero! Las tierras de alrededor están infestadas de slimes agresivos.',
      'Si me ayudas a derrotar a 2 slimes en los alrededores, te recompensaré con una poderosa Espada de Hierro.',
      '¿Aceptas esta misión para proteger nuestra aldea?',
    ],
    questId: 'derrotar_slimes',
  },
  npc_anciano: {
    npcName: 'Anciano de la Aldea',
    lines: [
      'Bienvenido a nuestro refugio. Ten cuidado al explorar más allá de los límites de la grilla.',
      'Usa [Espacio] para atacar, [Shift] para esquivar con dash, y [Q] para usar pociones.',
    ],
  },
  npc_mago: {
    npcName: 'Mago Elion',
    lines: [
      'El flujo del mana se siente inestable en esta zona...',
      'Estoy investigando las propiedades mágicas de los bloques de tierra y pasto.',
      '¡No me interrumpas o podrías desatar una explosión arcana!',
    ],
  },
  npc_guardia_norte: {
    npcName: 'Guardia del Norte Lionel',
    lines: [
      'Mantengo vigilado el sendero del norte contra los maleantes.',
      'Asegúrate de llevar suficientes pociones curativas antes de aventurarte más allá.',
    ],
  },
  npc_guardia_sur: {
    npcName: 'Guardia del Sur Roderick',
    lines: [
      'El viento sopla fuerte hoy desde las colinas.',
      'Por orden del consejo, ningún monstruo pasará estas puertas vivas.',
    ],
  },
  npc_comerciante: {
    npcName: 'Mercader Alaric',
    lines: [
      '¡Vendo las mejores sedas y pociones de toda la región!',
      '¿No tienes oro? Lástima, vuelve cuando hayas limpiado la zona de peligros.',
    ],
  },
  npc_sacerdotisa: {
    npcName: 'Sacerdotisa Selene',
    lines: [
      'Que la luz de la deidad guíe tus pasos en el sendero.',
      'Si te sientes herido, descansa un momento bajo la sombra de estos sagrados pinos.',
    ],
  },
  npc_arquera: {
    npcName: 'Guardabosques Kaelen',
    lines: [
      'Mis flechas nunca fallan el blanco. Los slimes de estas colinas son escurridizos, pero lentos.',
      'Mantén tu distancia usando el Dash para reposicionarte durante el combate.',
    ],
  },
  npc_bibliotecaria: {
    npcName: 'Archivera Moira',
    lines: [
      'Silencio, por favor. Estoy catalogando la historia mineralógica de esta grilla voxel.',
      '¿Sabías que los bloques de piedra a doble altura bloquean totalmente la trayectoria de las criaturas?',
    ],
  },
  npc_pescador: {
    npcName: 'Pescador Jaro',
    lines: [
      'El agua está perfecta para pescar hoy, aunque esos slimes asustan a los peces.',
      'Me pareció ver un brillo extraño en las profundidades del estanque.',
    ],
  },
  npc_bardo: {
    npcName: 'Bardo Lyra',
    lines: [
      '♪ Bajo el cielo pixelado, el héroe caminó, y con un dash sagrado, al slime derrotó... ♪',
      '¿Te gusta mi nueva balada? ¡Espero que inspire tus batallas!',
    ],
  },
  npc_granjero: {
    npcName: 'Granjero Tomas',
    lines: [
      'La tierra de esta zona es increíblemente fértil para cultivar trigo.',
      'Me encanta ver la hermosa transición orgánica entre el pasto y la tierra.',
    ],
  },
  npc_posadero: {
    npcName: 'Posadero Barnaby',
    lines: [
      '¡Bienvenidos a la Taberna del Vóxel Dorado!',
      'La chimenea está encendida y tenemos la mejor hidromiel caliente de la comarca.',
    ],
  },
  npc_minero: {
    npcName: 'Minero Flint',
    lines: [
      '¡Pico y pala todo el día! Esos muros de piedra son duros de roer.',
      'A veces se esconden tesoros valiosos debajo de las capas de piedra profunda.',
    ],
  },
  npc_alquimista: {
    npcName: 'Alquimista Vesper',
    lines: [
      'Cuidado con lo que tocas en mis estantes. Estoy destilando pociones de velocidad.',
      'Mezclar polvo arcano con raíces de pasto puede dar resultados... volátiles.',
    ],
  },
  npc_nino: {
    npcName: 'Pequeño Timmy',
    lines: [
      '¡Guau! ¿Eres un caballero de verdad? ¡Tienes una espada súper genial!',
      '¿Me enseñas a dar saltos rápidos como tú algún día?',
    ],
  },
  npc_local: {
    npcName: 'Habitante del Pueblo',
    lines: [
      '¡Saludos, viajero! Qué alegría ver caras nuevas por estos rumbos.',
      'Asegúrate de descansar en la taberna y tener tus armas listas para cualquier peligro en el camino.',
    ],
  },
  npc_aldeano_default: {
    npcName: 'Ciudadano',
    lines: [
      '¡Hola! El clima está maravilloso hoy para dar un paseo por los senderos de piedra.',
      'Dicen que los viajeros intrépidos obtienen grandes tesoros si exploran las ruinas del norte.',
    ],
  },
};
