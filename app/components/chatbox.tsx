"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css"
import { socket } from "../socket";
import { SOCKET_RECEIVED_EVENTS, SOCKET_SENT_EVENTS } from "../constants";

interface IChatList{
  id: number;
  text: string;
  senderName: string;
};

interface IChatMessageObject {
  chatMessageText: string;
  senderName: string;
}

const TEXT = {
  TypeSomething: "Type something here",
};

export default function ChatBox() {
  const [chatList, setChatList] = useState<IChatList[]>([]);
  const [inputText, setInputText] = useState("");
  const onChangeInput = (e: any) => {
    setInputText(e.target.value);
  };
  const chatBottomRef = useRef<any>();
  const isChatBottomReached = useRef(false);
  const onSubmitInput = useCallback((e: any) => {
    e.preventDefault();
    if(!e.target.value){
      return;
    }
    socket.emit(SOCKET_SENT_EVENTS.CHAT_MESSAGE_TO_SERVER, e.target.value);
    setInputText("");
  }, []);

  const updateChatList = useCallback((chatMessageObject: IChatMessageObject) => {
    const { chatMessageText, senderName} = chatMessageObject || {};
    let newId = 0;
    if(chatList.length > 0) {
      newId = chatList[chatList.length - 1].id + 1;
    }
    setChatList([...chatList, {
      id: newId,
      text: chatMessageText,
      senderName,
    }])
  }, [chatList]);

  const onKeyDown = useCallback((e: any) => {
    if(e.key === "Enter") {
      onSubmitInput(e);
    }
  }, [onSubmitInput]);

  useEffect(() => {
    if(isChatBottomReached.current) {
      chatBottomRef.current.scrollIntoView();
    }
  }, [chatList]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      isChatBottomReached.current = entry.isIntersecting;
    });
    observer.observe(chatBottomRef.current);
    return () => {
      observer.disconnect();
    }
  }, []);

  useEffect(() => {
    socket.connect();
    socket.on(SOCKET_RECEIVED_EVENTS.CHAT_MESSAGE_FROM_SERVER, updateChatList);
    return () => {
      socket.disconnect();
    }
  }, [updateChatList]);

  return (
    <div className="chatbox">
      <div className="chat-list-container">
        {
          chatList.map((item) => {
            return (
              <div key={item.id} className="chat-item">
                <div><b id='sender-name'>{item.senderName + ': '}</b></div>
                <div>{item.text}</div>
              </div>
            );
          })
        }
        <div ref={chatBottomRef}/>
      </div>
      <input 
        type="text"
        className="inputbox"
        value={inputText}
        placeholder={TEXT.TypeSomething}
        onChange={onChangeInput}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}