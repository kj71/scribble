"use client"
import Image from "next/image";
import ChatBox from "./components/ChatBox";
import { useCallback, useState } from "react";
import UserInput from "./components/UserInput";

export default function Home() {
  const [isUserInGame, setIsUserInGame] = useState(false);
  const goToGame = useCallback(() => {
    setIsUserInGame(true);
  }, []);
  return (
      isUserInGame ? <ChatBox/> : <UserInput goToGame={goToGame}/>
  );
}