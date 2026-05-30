"use client"
import { useCallback, useState } from "react";
import GameScreen from "./components/GameScreen";
import UserInput from "./components/UserInput";

export default function Home() {
  const [isUserInGame, setIsUserInGame] = useState(false);
  const [username, setUsername] = useState("");

  const goToGame = useCallback((name: string) => {
    setUsername(name);
    setIsUserInGame(true);
  }, []);

  return (
    isUserInGame ? <GameScreen username={username} /> : <UserInput goToGame={goToGame} />
  );
}