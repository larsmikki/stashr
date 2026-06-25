export const queryKeys = {
  auth: ['auth'] as const,
  albums: ['albums'] as const,
  album: (id: number) => ['album', id] as const,
  media: (albumId: number, sort: string, order: string, limit: number) =>
    ['media', albumId, { sort, order, limit }] as const,
  favorites: (sort: string, order: string, limit: number) =>
    ['favorites', { sort, order, limit }] as const,
  home: ['home'] as const,
  settings: ['settings'] as const,
  browsePath: (path?: string) => ['browse-path', path ?? ''] as const,
  mediaMetadata: (id: number) => ['media-metadata', id] as const,
  wall: ['wall'] as const,
}
