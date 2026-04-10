import type { GameRecord } from "@/lib/types/game";

export function getRelatedGames(
  currentGame: GameRecord,
  games: GameRecord[],
  limit = 3
) {
  const currentTags = new Set(currentGame.tags);

  return games
    .filter((candidate) => candidate.slug !== currentGame.slug)
    .map((candidate) => {
      const overlap = candidate.tags.filter((tag) => currentTags.has(tag)).length;
      return {
        game: candidate,
        score: overlap * 10_000 + candidate.views,
      };
    })
    .filter((entry) => entry.score > 0)
    .toSorted((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.game);
}
