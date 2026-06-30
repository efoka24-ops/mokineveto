import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';

export interface QueuedAction {
  id: string;
  type: 'CREATE_ANIMAL' | 'ADD_HEALTH_EVENT' | 'UPDATE_ANIMAL';
  payload: Record<string, unknown>;
  createdAt: number;
}

const QUEUE_KEY = 'mokinevet.offline-queue';

export const offlineQueue = {
  async add(type: QueuedAction['type'], payload: Record<string, unknown>): Promise<void> {
    const queue = await this.getAll();
    const action: QueuedAction = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      payload,
      createdAt: Date.now(),
    };
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  async getAll(): Promise<QueuedAction[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async remove(id: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((a) => a.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  async flush(): Promise<void> {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queue = await this.getAll();
    for (const action of queue) {
      try {
        switch (action.type) {
          case 'CREATE_ANIMAL':
            await api.post('/animals', action.payload, true);
            break;
          case 'ADD_HEALTH_EVENT':
            await api.post(
              `/animals/${action.payload.animalId}/health-events`,
              { ...action.payload, animalId: undefined },
              true
            );
            break;
          case 'UPDATE_ANIMAL':
            await api.patch(`/animals/${action.payload.id}`, action.payload, true);
            break;
        }
        await this.remove(action.id);
      } catch (_err) {
        console.warn(`[offlineQueue] Failed to sync ${action.id}, will retry later`);
      }
    }
  },

  async startSyncListener(): Promise<void> {
    NetInfo.addEventListener(async (state: any) => {
      if (state.isConnected) {
        await this.flush();
      }
    });
  },
};
