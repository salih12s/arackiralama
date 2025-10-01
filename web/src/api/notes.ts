import api from './client';

export interface Note {
  id: string;
  rowIndex: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  rowIndex: number;
  content: string;
}

export interface UpdateNoteData {
  rowIndex?: number;
  content?: string;
}

export const notesApi = {
  getAll: async (): Promise<Note[]> => {
    const response = await api.get('/notes');
    return response.data;
  },

  getById: async (id: string): Promise<Note> => {
    const response = await api.get(`/notes/${id}`);
    return response.data;
  },

  create: async (data: CreateNoteData): Promise<Note> => {
    const response = await api.post('/notes', data);
    return response.data;
  },

  update: async (id: string, data: UpdateNoteData): Promise<Note> => {
    const response = await api.put(`/notes/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
};