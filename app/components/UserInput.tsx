"use client"
import React, { useCallback, useState } from "react";

const TEXT = {
  EnterName: "Enter your nickname...",
  Title: "Scribble Multiplayer",
  Subtitle: "Draw, guess, and win with friends in real-time!"
};

interface UserInputProps {
  goToGame: (name: string) => void;
}

export default function UserInput({ goToGame }: UserInputProps) {
  const [userInput, setUserInput] = useState("");

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    goToGame(userInput.trim());
  }, [userInput, goToGame]);

  const onChangeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl text-center">
        {/* Title */}
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
          {TEXT.Title}
        </h1>
        <p className="text-slate-400 text-sm mb-8">{TEXT.Subtitle}</p>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="relative">
            <input 
              type="text"
              required
              value={userInput} 
              placeholder={TEXT.EnterName}
              onChange={onChangeInput}
              maxLength={15}
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl text-lg shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-150"
          >
            Enter Lobby
          </button>
        </form>
      </div>
    </div>
  );
}