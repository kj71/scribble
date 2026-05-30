"use client"
import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import Canvas from './Canvas';

interface GameScreenProps {
  username: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  disconnected?: boolean;
}

interface RoomState {
  id: string;
  players: Player[];
  gameState: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
  round: number;
  turnIndex: number;
  timeLeft: number;
  drawerId: string | null;
  drawerName: string | null;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  channel: 'public' | 'guessed';
}

export default function GameScreen({ username }: GameScreenProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [lobbyCountdown, setLobbyCountdown] = useState<number | null>(null);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [chatList, setChatList] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [hasGuessed, setHasGuessed] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    socket.auth = { username };
    socket.connect();

    const handleRoomState = (state: RoomState) => {
      setRoomState(state);
      const drawer = state.players[state.turnIndex];
      if (drawer && drawer.id === socket.id) {
        setHasGuessed(true);
      }
    };

    const handleLobbyCountdown = (count: number | null) => {
      setLobbyCountdown(count);
    };

    const handleTurnStart = (data: { drawerId: string; drawerName: string; word: string; round: number; timeLeft: number }) => {
      setCurrentWord(data.word);
      setHasGuessed(data.drawerId === socket.id);
    };

    const handleTimerUpdate = (timeLeft: number) => {
      setRoomState(prev => prev ? { ...prev, timeLeft } : null);
    };

    const handleChatMessage = (msg: { senderName: string; text: string; channel: 'public' | 'guessed' }) => {
      setChatList(prev => [...prev, {
        id: Math.random().toString(),
        senderName: msg.senderName,
        text: msg.text,
        channel: msg.channel || 'public'
      }]);

      if (msg.senderName === 'System' && msg.text.includes('guessed the word') && msg.text.includes(username)) {
        setHasGuessed(true);
      }
    };

    const handleGameOver = (data: { players: Player[]; winner: string }) => {
      setRoomState(prev => prev ? { ...prev, gameState: 'GAME_OVER' } : null);
    };

    socket.on('room-state', handleRoomState);
    socket.on('lobby-countdown', handleLobbyCountdown);
    socket.on('turn-start', handleTurnStart);
    socket.on('timer-update', handleTimerUpdate);
    socket.on('chat-message', handleChatMessage);
    socket.on('game-over', handleGameOver);

    return () => {
      socket.off('room-state', handleRoomState);
      socket.off('lobby-countdown', handleLobbyCountdown);
      socket.off('turn-start', handleTurnStart);
      socket.off('timer-update', handleTimerUpdate);
      socket.off('chat-message', handleChatMessage);
      socket.off('game-over', handleGameOver);
      socket.disconnect();
    };
  }, [username]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatList]);

  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socket.emit('chat-message', inputText);
    setInputText('');
  };

  const isDrawer = roomState?.drawerId === socket.id;

  // LOBBY STATE RENDER
  if (roomState?.gameState === 'LOBBY') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent">
            Game Lobby
          </h1>
          <p className="text-slate-400 text-sm mb-6">Waiting for players to join (Max 5)</p>

          <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 mb-6">
            <h3 className="text-left font-bold text-slate-300 text-sm mb-3">Players Joined ({roomState.players.length}/5):</h3>
            <ul className="space-y-2">
              {roomState.players.map((p, idx) => (
                <li key={p.id} className="flex items-center justify-between bg-white/5 py-2 px-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-400 font-bold">#{idx + 1}</span>
                    <span className={`font-semibold ${p.disconnected ? 'text-slate-500 line-through' : ''}`}>
                      {p.name} {p.id === socket.id && '(You)'}
                    </span>
                  </div>
                  {p.disconnected && <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">Away</span>}
                </li>
              ))}
            </ul>
          </div>

          {lobbyCountdown !== null ? (
            <div className="bg-indigo-500/20 border border-indigo-500/40 rounded-xl py-3 text-indigo-300 font-bold text-lg">
              Starting in {lobbyCountdown} seconds...
            </div>
          ) : (
            <div className="text-slate-400 text-sm">
              Need at least {Math.max(0, 2 - roomState.players.filter(p => !p.disconnected).length)} more player(s) to start
            </div>
          )}
        </div>
      </div>
    );
  }

  // GAME OVER STATE RENDER
  if (roomState?.gameState === 'GAME_OVER') {
    const sortedPlayers = [...roomState.players].sort((a, b) => b.score - a.score);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent animate-bounce">
            Game Over!
          </h1>
          <p className="text-slate-300 font-medium mb-8">Here is the final scoreboard:</p>

          <div className="flex flex-col gap-3 mb-8">
            {sortedPlayers.map((p, idx) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between py-3 px-6 rounded-2xl border transition ${
                  idx === 0 
                    ? 'bg-yellow-500/20 border-yellow-500/50 shadow-lg text-yellow-200' 
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${idx === 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-lg">{p.name}</span>
                </div>
                <span className="font-extrabold text-xl">{p.score} pts</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition shadow-lg active:scale-95"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // PLAYING STATE RENDER
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-sans">
      {/* Top Header Bar */}
      <header className="flex-none flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Round</span>
            <div className="text-xl font-extrabold">{roomState?.round || 1} / 3</div>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Time Left</span>
            <div className={`text-xl font-extrabold ${roomState?.timeLeft && roomState.timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>
              {roomState?.timeLeft ?? 60}s
            </div>
          </div>
        </div>

        {/* Word Display */}
        <div className="bg-white/10 border border-white/15 px-6 py-3 rounded-2xl shadow-inner max-w-xs text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            {isDrawer ? 'Your Word to Draw' : 'Guess the Word'}
          </span>
          <div className="text-2xl font-black tracking-widest text-indigo-300">
            {currentWord}
          </div>
        </div>

        {/* Active drawer display */}
        <div className="text-right">
          <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Drawing Now</span>
          <div className="text-lg font-extrabold text-pink-400">
            {isDrawer ? 'You!' : roomState?.drawerName || 'Wait...'}
          </div>
        </div>
      </header>

      {/* Main Grid Section (Locked to screen, no page scrolling) */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden">
        {/* Left Scoreboard Sidebar */}
        <section className="lg:col-span-1 flex flex-col h-full min-h-0 bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md overflow-hidden">
          <h2 className="text-lg font-bold text-slate-200 mb-4 pb-2 border-b border-white/5 flex-none">Scoreboard</h2>
          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
            {roomState?.players.map((p) => {
              const isCurrentDrawer = p.id === roomState.drawerId;
              return (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    isCurrentDrawer 
                      ? 'bg-pink-500/10 border-pink-500/30' 
                      : p.id === socket.id 
                        ? 'bg-indigo-500/15 border-indigo-500/30' 
                        : 'bg-white/5 border-white/5'
                  } ${p.disconnected ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {isCurrentDrawer && (
                      <span className="text-pink-400 animate-bounce" title="Drawing">
                        ✏️
                      </span>
                    )}
                    <span className="font-semibold text-slate-100">
                      {p.name} {p.id === socket.id && '(You)'}
                    </span>
                    {p.disconnected && (
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 rounded">Away</span>
                    )}
                  </div>
                  <span className="font-bold text-indigo-300">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Center Canvas Column */}
        <section className="lg:col-span-2 flex flex-col items-center justify-center h-full min-h-0 overflow-hidden">
          <Canvas isDrawer={isDrawer} socket={socket} />
        </section>

        {/* Right Chat Sidebar */}
        <section className="lg:col-span-1 flex flex-col h-full min-h-0 bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-4 bg-white/5 border-b border-white/5 flex-none">
            <h2 className="text-lg font-bold text-slate-200">Chat & Guesses</h2>
          </div>
          
          <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3 flex flex-col">
            {chatList.map((chat) => {
              const isSystem = chat.senderName === 'System';
              const isGuessedAlert = chat.text.includes('guessed the word');
              const isGuessedChannel = chat.channel === 'guessed';
              const isSenderDrawer = roomState && chat.senderName === roomState.drawerName;
              return (
                <div 
                  key={chat.id} 
                  className={`py-2 px-3 rounded-xl max-w-[90%] text-sm ${
                    isGuessedAlert 
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 self-center w-full text-center'
                      : isSystem 
                        ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 self-center w-full text-center'
                        : isGuessedChannel
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 self-start'
                          : chat.senderName === username
                            ? 'bg-indigo-600/30 text-white border border-indigo-600/30 self-end'
                            : 'bg-white/5 text-slate-200 border border-white/5 self-start'
                  }`}
                >
                  {!isSystem && (
                    <div className={`font-bold text-xs mb-0.5 ${isGuessedChannel ? 'text-emerald-400' : 'text-indigo-300'}`}>
                      {chat.senderName} {isGuessedChannel && (isSenderDrawer ? ' [Drawer]' : ' [Guessed]')}
                    </div>
                  )}
                  <div className="break-all">{chat.text}</div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendGuess} className="p-3 bg-white/5 border-t border-white/5 flex-none flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isDrawer 
                  ? 'Comments (visible only to guessed players)...' 
                  : hasGuessed 
                    ? 'Chatting with drawer & guessed players...' 
                    : 'Type your guess here...'
              }
              className={`flex-1 bg-slate-900/50 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 ${
                isDrawer || hasGuessed ? 'border-emerald-500/30 focus:border-emerald-500' : 'border-white/10'
              }`}
            />
            <button
              type="submit"
              className={`px-4 py-2.5 text-white rounded-xl text-sm font-bold transition shadow-md active:scale-95 ${
                isDrawer || hasGuessed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isDrawer || hasGuessed ? 'Send' : 'Guess'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
