import { create } from "zustand";
import { io } from "socket.io-client";
import { API_URL } from "../constants/api";
import { useAuthStore } from "./authStore";

const BASE_URL = API_URL.replace("/api", "");

export const useChatStore = create((set, get) => ({
  socket: null,
  connectedUsers: [],
  messages: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_URL}/messages/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      set({ connectedUsers: data });
    } catch (error) {
      console.error("Error in getUsers:", error);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_URL}/messages/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      set({ messages: data });
    } catch (error) {
      console.error("Error in getMessages:", error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_URL}/messages/send/${selectedUser._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });
      const data = await res.json();
      set({ messages: [...messages, data] });
    } catch (error) {
      console.error("Error in sendMessage:", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, socket } = get();
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const isMessageFromSelectedUser = newMessage.senderId === selectedUser?._id;
      if (!isMessageFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const { socket } = get();
    if (!socket) return;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  connectSocket: () => {
    const { user } = useAuthStore.getState();
    if (!user || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: user._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      // Potentially store online status
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
