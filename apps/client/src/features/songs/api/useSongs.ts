import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSongRAMCache } from "@/features/dashboard/hooks/useSongRAMCache";

export interface Song {
  id: string;
  title: string;
  artist?: string;
  dateAdded: string;
  thumbnail?: string;
  alternativeTitles?: string[];
  sections?: Array<{
    id: string;
    type: "verse" | "chorus";
    number: number;
    label: string;
    content: string;
  }>;
  verseOrder?: string;
  authors?: string[] | string;
  topics?: string[] | string;
  copyright?: string;
  createdAt?: string;
  structure?: string[];
  lyrics?: string;
}

export const useSongs = () => {
  return useQuery<{ success: boolean; songs: Song[] }>({
    queryKey: ["/api/songs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/songs");
      if (!response.ok) {
        throw new Error("Failed to fetch songs");
      }
      return response.json();
    },
    enabled: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateSong = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (songData: Partial<Song>) => {
      const response = await apiRequest("POST", "/api/songs", songData);
      if (!response.ok) {
        throw new Error("Failed to create song");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: ["/api/songs"] });
      queryClient.refetchQueries({ queryKey: ["/api/songs"] });
      // Keep the live console's offline song search (backed by IndexedDB/RAM,
      // not this query cache) in sync so newly-added songs show up in it
      // immediately instead of only after the next project-selection sync.
      if (data?.song) useSongRAMCache.getState().invalidate(data.song);
    },
  });
};

export const useUpdateSong = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, songData }: { id: string; songData: Partial<Song> }) => {
      const response = await apiRequest("PUT", `/api/songs/${id}`, songData);
      if (!response.ok) {
        throw new Error("Failed to update song");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.removeQueries({ queryKey: ["/api/songs"] });
      queryClient.removeQueries({ queryKey: ["/api/songs", variables.id] });
      queryClient.refetchQueries({ queryKey: ["/api/songs"] });
      if (data?.song) useSongRAMCache.getState().invalidate(data.song);
    },
  });
};

export const useDeleteSong = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/songs/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete song");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
    },
  });
};

export const useImportSong = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, format }: { file: File; format: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      
      const response = await fetch('/api/songs/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Import failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      if (data?.song) useSongRAMCache.getState().invalidate(data.song);
    },
  });
};
