"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Client, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export function useWebSocket(token: string | null) {
  const clientRef = useRef<Client | null>(null);
  const tokenRef = useRef<string | null>(token);
  const [connected, setConnected] = useState(false);

  useEffect(() => { tokenRef.current = token; }, [token]);

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      reconnectDelay: 5000,
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const subscribe = useCallback(
    (dest: string, cb: (body: any) => void): StompSubscription | undefined => {
      return clientRef.current?.subscribe(dest, (msg) =>
        cb(JSON.parse(msg.body))
      );
    },
    []
  );

  const send = useCallback((dest: string, body: any) => {
    clientRef.current?.publish({
      destination: dest,
      body: JSON.stringify(body),
      headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
    });
  }, []);

  return { connected, subscribe, send };
}
