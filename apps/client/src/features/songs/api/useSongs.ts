import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiRequest, buildUrl } from "@/lib/queryClient";
import { removeSongFromList, upsertSongInList } from "../songListCache";
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
  /** Base formatting per section (font, size, bold, colour ...), keyed by the section label */
  sectionStyles?: Record<string, import("@/features/songs/songFormatting").LyricStyle>;
  /** Inline formatting per section (sanitised HTML), keyed by the section label */
  sectionHtml?: Record<string, string>;
  authors?: string[] | string;
  topics?: string[] | string;
  copyright?: string;
  createdAt?: string;
  /** When the song was last saved; changes on every edit */
  updatedAt?: string;
  structure?: string[];
  lyrics?: string;
}

export { isSavedSongId } from "../songId";

const SONGS_KEY = ["/api/songs"];

// Puts a just-saved song into the cached list (replacing it if it is already there)
const cacheSong = (queryClient: QueryClient, song: Song) => {
  queryClient.setQueryData<{ success: boolean; songs: Song[] }>(SONGS_KEY, (old) => ({
    success: true,
    ...old,
    songs: upsertSongInList(old?.songs ?? [], song),
  }));
};

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
      // Show the new song in the list at once, then confirm with the server
      if (data?.song) cacheSong(queryClient, data.song);
      queryClient.invalidateQueries({ queryKey: SONGS_KEY });
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
    onSuccess: (data) => {
      // The edited song replaces its old version in the list at once (it is the same song,
      // not a new one), then the list is confirmed with the server
      if (data?.song) cacheSong(queryClient, data.song);
      queryClient.invalidateQueries({ queryKey: SONGS_KEY });
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
    onSuccess: (_data, id) => {
      queryClient.setQueryData<{ success: boolean; songs: Song[] }>(SONGS_KEY, (old) =>
        old ? { ...old, songs: removeSongFromList(old.songs, id) } : old,
      );
      queryClient.invalidateQueries({ queryKey: SONGS_KEY });
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
      
      // Same address and sign-in token as every other request; without them the server
      // refuses the import and nothing is saved
      const token = localStorage.getItem('token');
      const response = await fetch(buildUrl('/api/songs/import'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
