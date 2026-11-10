import type { LanguageCode } from './languages'

const en = {
  'common.rules': 'Rules',
  'common.leave': 'Leave',
  'common.back': 'Back',
  'common.backToGame': 'Back to game',
  'common.host': 'host',
  'common.bot': 'bot',
  'common.you': 'you',
  'common.offline': 'offline',
  'common.pts': 'pts',
  'common.rounds': 'rounds',
  'common.perRound': 'per round',
  'common.ready': 'ready',
  'common.locked': 'locked',
  'common.thinking': 'thinking',
  'common.first': '· first',
  'common.firstBlood': '· first blood',
  'common.room': 'Room',
  'common.copy': 'copy',
  'common.copied': 'copied',
  'common.copyCode': 'Copy room code',
  'common.remove': 'Remove {name}',
  'room.wordLanguage': 'Word language',
  'header.language': 'Language',
  'header.theme': 'Theme',
  'header.switchToLight': 'Switch to light theme',
  'header.switchToDark': 'Switch to dark theme',
  'status.live': 'live',
  'status.connecting': 'connecting',
  'status.disconnected': 'disconnected',
  'status.reconnecting': 'Reconnecting to the room...',
  'status.connectingServer': 'Connecting to the server...',
  'status.connectionLost': 'Connection lost. Trying to reconnect...',
  'home.eyebrow': 'Real-time word battle',
  'home.tagline':
    'Race the clock and the room. Every answer must contain the target letters.',
  'home.playAs': 'Play as',
  'home.displayName': 'Display name',
  'home.namePlaceholder': 'e.g. Lexi',
  'home.createRoom': 'Create a room',
  'home.playBots': 'Play vs bots',
  'home.hostNote': 'You will be the host. Play vs bots fills three seats instantly.',
  'home.languageNote': 'New rooms use the language selected in the header.',
  'home.joinRoom': 'Join a room',
  'home.roomCode': 'Room code',
  'home.join': 'Join room',
  'home.askHost': 'Ask the host for the 4-letter code.',
  'home.howToPlay': 'How to play',
  'home.how1': "Create a room and share the code, or join a friend's room.",
  'home.how2':
    'Each round reveals a target letter combo. Submit a word that contains it.',
  'home.how3':
    'Faster, longer and first answers score more. The highest score after five rounds wins.',
  'home.rulesButton': 'Rules & scoring',
  'lobby.eyebrow': 'Lobby',
  'lobby.waiting': 'Waiting for players',
  'lobby.share':
    'Share the code so friends can join. The host starts the match when everyone is ready.',
  'lobby.bots': 'Bots',
  'lobby.botsNote':
    'Add computer players to keep the room competitive. Starting alone fills three seats automatically.',
  'lobby.addBot': 'Add bot',
  'lobby.startWithBots': 'Start with bots',
  'lobby.startGame': 'Start game',
  'lobby.starting': 'Starting...',
  'lobby.waitingHost': 'Waiting for the host to start...',
  'lobby.players': 'Players',
  'play.round': 'Round {index} / {total}',
  'play.mustContain': 'Your word must contain',
  'play.lockedIn': 'Locked in',
  'play.lockedNote': 'Nice. Your word is locked in for this round.',
  'play.yourWord': 'Your word',
  'play.placeholder': 'Contains "{target}" · {min}+ letters',
  'play.submit': 'Submit word',
  'play.checking': 'Checking...',
  'play.accepted': 'Accepted "{word}" for {points} points',
  'play.didNotCount': 'That word did not count',
  'play.wordsInPlay': 'Words in play',
  'play.noWords': 'No words yet. Be the first.',
  'play.hiddenWords': 'Submit your word to see what others found.',
  'results.roundOf': 'Round {index} of {total}',
  'results.complete': 'Round complete',
  'results.target': 'Target',
  'results.roundWords': 'Round words',
  'results.noWords': 'Nobody found a word this round.',
  'results.leaderboard': 'Leaderboard',
  'results.nextRound': 'Next round',
  'results.starting': 'Starting...',
  'results.waitingHost': 'Waiting for the host to continue...',
  'over.eyebrow': 'Final standings',
  'over.title': 'Game over',
  'over.winner': '{name} wins!',
  'over.tie': "It's a tie between {names}!",
  'over.nobody': 'Nobody',
  'over.rounds': '{count} rounds',
  'over.playAgain': 'Play again',
  'over.restarting': 'Restarting...',
  'over.waitingHost': 'Waiting for the host to start a rematch...',
  'rules.eyebrow': 'How to play',
  'rules.title': 'Rules &',
  'rules.titleHighlight': 'scoring',
  'rules.lede':
    'Every round gives the room a target letter combo. Find a real word that contains it, lock it in before the clock runs out, and score more by answering fast, answering long, and getting there first.',
  'rules.goalTitle': 'The goal',
  'rules.goalText':
    'Race the other players to the best word for each target. You can submit one word per round. Once you submit, you are locked in until the round ends.',
  'rules.step1': 'The host starts the match and each new round.',
  'rules.step2': 'Read the target, then type a word that contains it.',
  'rules.step3': 'Submit before the timer hits zero. Early words score more.',
  'rules.step4': 'After the final round, the highest total score wins.',
  'rules.scoringTitle': 'Scoring',
  'rules.scoringText': 'Points are added together for every accepted word.',
  'rules.formula': 'points = base + length + speed + first blood',
  'rules.baseWord': 'Base word',
  'rules.length': 'Length',
  'rules.lengthValue': '+{points} per letter above {min}',
  'rules.speed': 'Speed',
  'rules.speedValue': 'up to +{points}',
  'rules.firstBlood': 'First blood',
  'rules.firstBloodValue': '+{points} for the first word',
  'rules.exampleEyebrow': 'Worked example',
  'rules.exampleIntro':
    '{word} is {letters} letters, submitted first with 12 seconds left:',
  'rules.validTitle': 'Valid words',
  'rules.valid1': 'Between {min} and {max} letters long.',
  'rules.valid2':
    "Must contain the round's target letters, in order. For target {target}, words like {example1} and {example2} count.",
  'rules.valid3': 'Must be a real dictionary word. Made-up words are rejected.',
  'rules.valid4':
    'A word can only be used once per match, so watch what the room has already played.',
  'rules.valid5': 'Duplicates and late submissions do not score.',
  'rules.matchTitle': 'Match rules',
  'rules.match1': 'A match lasts {rounds} rounds, with {seconds} seconds per round.',
  'rules.match2': 'The host controls starting the match, the next round, and rematches.',
  'rules.match3':
    'Bots can fill empty seats. They use real words and compete for the same points.',
  'rules.match4':
    'At the end, players are ranked by total points. Tied players share the same place.',
  'rules.exampleTarget': 'umb',
  'rules.exampleWord1': 'thumb',
  'rules.exampleWord2': 'plumber',
  'rules.workedWord': 'planet',
  'error.unreachable': 'Could not reach the server. Please try again.',
  'error.chooseNameCreate': 'Choose a name before creating a room',
  'error.chooseNameJoin': 'Choose a name before joining a room',
  'error.enterCode': 'Enter a room code',
  'error.createRoom': 'Could not create a room',
  'error.joinRoom': 'Could not join that room',
  'error.actionUnavailable': 'That action is not available right now',
  'error.addBot': 'Could not add a bot',
  'error.removeBot': 'Could not remove that bot',
  'error.roomGone': 'That room is no longer available',
  'error.roomClosed': 'The room was closed',
  'error.notInRoom': 'You are not in a room',
  'error.noRoom': 'No room with that code',
  'error.inProgress': 'That game is already in progress',
  'error.roomFull': 'That room is full',
  'error.hostAddBots': 'Only the host can add bots',
  'error.botsLobby': 'Bots can only be added in the lobby',
  'error.hostRemoveBots': 'Only the host can remove bots',
  'error.botsRemoveLobby': 'Bots can only be removed in the lobby',
  'error.notBot': 'That is not a bot in this room',
  'error.hostStart': 'Only the host can start the game',
  'error.alreadyStarted': 'The game already started',
  'error.hostNext': 'Only the host can start the next round',
  'error.noRound': 'No round is ready to start',
  'error.hostRestart': 'Only the host can restart the game',
  'error.notInThisRoom': 'You are not in this room',
  'reason.tooShort': 'Words need at least {min} letters',
  'reason.tooLong': 'Words can be at most {max} letters',
  'reason.missingTarget': 'Your word must contain the target letters',
  'reason.notAWord': 'That is not a word we recognise',
  'reason.duplicate': 'Someone already used that word',
  'reason.alreadySubmitted': 'You already locked in a word this round',
  'reason.roundClosed': 'This round is already over',
  'reason.unknown': 'Something went wrong',
} as const

export type MessageKey = keyof typeof en

const bg: Record<MessageKey, string> = {
  'common.rules': 'Правила',
  'common.leave': 'Напусни',
  'common.back': 'Назад',
  'common.backToGame': 'Обратно към играта',
  'common.host': 'домакин',
  'common.bot': 'бот',
  'common.you': 'ти',
  'common.offline': 'офлайн',
  'common.pts': 'т.',
  'common.rounds': 'рунда',
  'common.perRound': 'на рунд',
  'common.ready': 'готови',
  'common.locked': 'заключено',
  'common.thinking': 'мисли',
  'common.first': '· първи',
  'common.firstBlood': '· първа кръв',
  'common.room': 'Стая',
  'common.copy': 'копирай',
  'common.copied': 'копирано',
  'common.copyCode': 'Копирай кода на стаята',
  'common.remove': 'Премахни {name}',
  'room.wordLanguage': 'Език на думите',
  'header.language': 'Език',
  'header.theme': 'Тема',
  'header.switchToLight': 'Превключи на светла тема',
  'header.switchToDark': 'Превключи на тъмна тема',
  'status.live': 'на живо',
  'status.connecting': 'свързване',
  'status.disconnected': 'прекъснато',
  'status.reconnecting': 'Свързване отново със стаята...',
  'status.connectingServer': 'Свързване със сървъра...',
  'status.connectionLost': 'Връзката е загубена. Опит за свързване отново...',
  'home.eyebrow': 'Словесна битка в реално време',
  'home.tagline':
    'Надпреварвай се с часовника и стаята. Всяка дума трябва да съдържа целевите букви.',
  'home.playAs': 'Играй като',
  'home.displayName': 'Име за показване',
  'home.namePlaceholder': 'напр. Лекси',
  'home.createRoom': 'Създай стая',
  'home.playBots': 'Играй срещу ботове',
  'home.hostNote': 'Ти ще си домакинът. „Играй срещу ботове“ запълва три места веднага.',
  'home.languageNote': 'Новите стаи използват езика, избран в горната лента.',
  'home.joinRoom': 'Присъедини се към стая',
  'home.roomCode': 'Код на стаята',
  'home.join': 'Присъедини се',
  'home.askHost': 'Попитай домакина за 4-буквения код.',
  'home.howToPlay': 'Как се играе',
  'home.how1': 'Създай стая и сподели кода или се присъедини към стая на приятел.',
  'home.how2':
    'Всеки рунд показва целева комбинация от букви. Изпрати дума, която я съдържа.',
  'home.how3':
    'По-бързите, по-дългите и първите отговори носят повече точки. Най-високият резултат след пет рунда печели.',
  'home.rulesButton': 'Правила и точкуване',
  'lobby.eyebrow': 'Лоби',
  'lobby.waiting': 'Чакаме играчи',
  'lobby.share':
    'Сподели кода, за да се присъединят приятели. Домакинът започва мача, когато всички са готови.',
  'lobby.bots': 'Ботове',
  'lobby.botsNote':
    'Добави компютърни играчи, за да е конкурентна стаята. Ако започнеш сам, три места се запълват автоматично.',
  'lobby.addBot': 'Добави бот',
  'lobby.startWithBots': 'Започни с ботове',
  'lobby.startGame': 'Започни игра',
  'lobby.starting': 'Започване...',
  'lobby.waitingHost': 'Чакаме домакинът да започне...',
  'lobby.players': 'Играчи',
  'play.round': 'Рунд {index} / {total}',
  'play.mustContain': 'Думата ти трябва да съдържа',
  'play.lockedIn': 'Заключено',
  'play.lockedNote': 'Браво. Думата ти е заключена за този рунд.',
  'play.yourWord': 'Твоята дума',
  'play.placeholder': 'Съдържа „{target}“ · {min}+ букви',
  'play.submit': 'Изпрати дума',
  'play.checking': 'Проверка...',
  'play.accepted': 'Приета „{word}“ за {points} точки',
  'play.didNotCount': 'Тази дума не се брои',
  'play.wordsInPlay': 'Думи в игра',
  'play.noWords': 'Още няма думи. Бъди първи.',
  'play.hiddenWords': 'Изпрати думата си, за да видиш какво са намерили другите.',
  'results.roundOf': 'Рунд {index} от {total}',
  'results.complete': 'Рундът приключи',
  'results.target': 'Цел',
  'results.roundWords': 'Думи от рунда',
  'results.noWords': 'Никой не намери дума този рунд.',
  'results.leaderboard': 'Класиране',
  'results.nextRound': 'Следващ рунд',
  'results.starting': 'Започване...',
  'results.waitingHost': 'Чакаме домакинът да продължи...',
  'over.eyebrow': 'Крайно класиране',
  'over.title': 'Край на играта',
  'over.winner': '{name} печели!',
  'over.tie': 'Равенство между {names}!',
  'over.nobody': 'Никой',
  'over.rounds': '{count} рунда',
  'over.playAgain': 'Играй отново',
  'over.restarting': 'Рестартиране...',
  'over.waitingHost': 'Чакаме домакинът да започне нова игра...',
  'rules.eyebrow': 'Как се играе',
  'rules.title': 'Правила и',
  'rules.titleHighlight': 'точкуване',
  'rules.lede':
    'Всеки рунд дава на стаята целева комбинация от букви. Намери истинска дума, която я съдържа, заключи я преди времето да изтече и събери повече точки с бърз, дълъг и пръв отговор.',
  'rules.goalTitle': 'Целта',
  'rules.goalText':
    'Надпревари останалите играчи с най-добрата дума за всяка цел. Можеш да изпратиш една дума на рунд. След като я изпратиш, си заключен до края на рунда.',
  'rules.step1': 'Домакинът започва мача и всеки нов рунд.',
  'rules.step2': 'Прочети целта и напиши дума, която я съдържа.',
  'rules.step3': 'Изпрати преди таймерът да стигне нула. По-ранните думи носят повече точки.',
  'rules.step4': 'След последния рунд печели играчът с най-висок общ резултат.',
  'rules.scoringTitle': 'Точкуване',
  'rules.scoringText': 'Точките се събират за всяка приета дума.',
  'rules.formula': 'точки = база + дължина + скорост + първа кръв',
  'rules.baseWord': 'Базова дума',
  'rules.length': 'Дължина',
  'rules.lengthValue': '+{points} за буква над {min}',
  'rules.speed': 'Скорост',
  'rules.speedValue': 'до +{points}',
  'rules.firstBlood': 'Първа кръв',
  'rules.firstBloodValue': '+{points} за първата дума',
  'rules.exampleEyebrow': 'Пример',
  'rules.exampleIntro':
    '{word} е от {letters} букви, изпратена първа с 12 секунди остатък:',
  'rules.validTitle': 'Валидни думи',
  'rules.valid1': 'С дължина между {min} и {max} букви.',
  'rules.valid2':
    'Трябва да съдържа целевите букви на рунда, в този ред. За цел {target} думи като {example1} и {example2} се приемат.',
  'rules.valid3': 'Трябва да е истинска речникова дума. Измислените думи се отхвърлят.',
  'rules.valid4':
    'Всяка дума може да се използва само веднъж на мач, затова следи какво вече е играла стаята.',
  'rules.valid5': 'Повторенията и закъснелите отговори не носят точки.',
  'rules.matchTitle': 'Правила на мача',
  'rules.match1': 'Мачът трае {rounds} рунда по {seconds} секунди.',
  'rules.match2': 'Домакинът контролира започването на мача, следващия рунд и реванша.',
  'rules.match3':
    'Ботовете могат да запълват свободни места. Те използват истински думи и се състезават за същите точки.',
  'rules.match4':
    'Накрая играчите се класират по общ брой точки. Равните играчи делят едно място.',
  'rules.exampleTarget': 'ост',
  'rules.exampleWord1': 'мост',
  'rules.exampleWord2': 'кост',
  'rules.workedWord': 'планета',
  'error.unreachable': 'Сървърът не е достъпен. Опитай отново.',
  'error.chooseNameCreate': 'Избери име, преди да създадеш стая',
  'error.chooseNameJoin': 'Избери име, преди да се присъединиш към стая',
  'error.enterCode': 'Въведи код на стая',
  'error.createRoom': 'Стаята не може да бъде създадена',
  'error.joinRoom': 'Не може да се присъединиш към тази стая',
  'error.actionUnavailable': 'Това действие не е налично в момента',
  'error.addBot': 'Ботът не може да бъде добавен',
  'error.removeBot': 'Този бот не може да бъде премахнат',
  'error.roomGone': 'Тази стая вече не е налична',
  'error.roomClosed': 'Стаята беше затворена',
  'error.notInRoom': 'Не си в стая',
  'error.noRoom': 'Няма стая с този код',
  'error.inProgress': 'Тази игра вече е започнала',
  'error.roomFull': 'Тази стая е пълна',
  'error.hostAddBots': 'Само домакинът може да добавя ботове',
  'error.botsLobby': 'Ботове могат да се добавят само в лобито',
  'error.hostRemoveBots': 'Само домакинът може да премахва ботове',
  'error.botsRemoveLobby': 'Ботове могат да се премахват само в лобито',
  'error.notBot': 'Това не е бот в тази стая',
  'error.hostStart': 'Само домакинът може да започне играта',
  'error.alreadyStarted': 'Играта вече е започнала',
  'error.hostNext': 'Само домакинът може да започне следващия рунд',
  'error.noRound': 'Няма рунд, готов за започване',
  'error.hostRestart': 'Само домакинът може да рестартира играта',
  'error.notInThisRoom': 'Не си в тази стая',
  'reason.tooShort': 'Думите трябва да са поне {min} букви',
  'reason.tooLong': 'Думите могат да са най-много {max} букви',
  'reason.missingTarget': 'Думата ти трябва да съдържа целевите букви',
  'reason.notAWord': 'Това не е дума, която разпознаваме',
  'reason.duplicate': 'Някой вече използва тази дума',
  'reason.alreadySubmitted': 'Вече заключи дума този рунд',
  'reason.roundClosed': 'Този рунд вече приключи',
  'reason.unknown': 'Нещо се обърка',
}

const messages: Record<LanguageCode, Record<MessageKey, string>> = { en, bg }

export type MessageVars = Record<string, string | number>

export const translate = (
  language: LanguageCode,
  key: MessageKey,
  vars?: MessageVars,
): string => {
  const template = messages[language][key]

  if (!vars) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = vars[name]
    return value === undefined ? `{${name}}` : String(value)
  })
}

export const ordinal = (language: LanguageCode, value: number): string => {
  if (language === 'bg') {
    const last = value % 10
    const teen = value % 100 >= 11 && value % 100 <= 13
    const suffix = teen
      ? 'то'
      : last === 1
        ? 'во'
        : last === 2
          ? 'ро'
          : last === 7 || last === 8
            ? 'мо'
            : 'то'
    return `${value}-${suffix}`
  }

  const mod100 = value % 100
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`
  }

  switch (value % 10) {
    case 1:
      return `${value}st`
    case 2:
      return `${value}nd`
    case 3:
      return `${value}rd`
    default:
      return `${value}th`
  }
}
