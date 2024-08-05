"use client"
import { useCallback, useState } from "react";
import "./styles.css"

const TEXT = {
  EnterName: "Enter your name",
};

interface IProps {
  goToGame: () => void;
}

export default function UserInput(props: IProps) {
  const { goToGame } = props;
  const [userInput, setUserInput] = useState("");
  const onSubmit = useCallback((e: any) => {
    e.preventDefault();
    goToGame();
  }, [goToGame]);
  const onChangeInput = useCallback((e: any) => {
    setUserInput(e.target.value);
  }, []);
  return (
    <div>
      <form onSubmit={onSubmit}>
        <input 
          value={userInput} 
          placeholder={TEXT.EnterName}
          onChange={onChangeInput}
        />
        <input type="submit"/>
      </form>
    </div>
  );
}