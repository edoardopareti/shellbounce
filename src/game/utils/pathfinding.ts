import Phaser from 'phaser';
import type { Wall } from '../map/types';

interface GridCell {
  column: number;
  row: number;
}

export interface NavigationGrid {
  width: number;
  height: number;
  cellSize: number;
  walkable: boolean[];
}

export function buildNavigationGrid(
  walls: readonly Wall[],
  width: number,
  height: number,
  tankRadius: number,
  cellSize: number,
): NavigationGrid {
  const columns = Math.max(1, Math.floor(width / cellSize));
  const rows = Math.max(1, Math.floor(height / cellSize));
  const walkable = new Array<boolean>(columns * rows).fill(true);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const center = cellToWorld(column, row, cellSize);
      if (intersectsAnyWall(center.x, center.y, tankRadius, walls)) {
        walkable[row * columns + column] = false;
      }
    }
  }

  return {
    width: columns,
    height: rows,
    cellSize,
    walkable,
  };
}

export function findPath(
  grid: NavigationGrid,
  startWorld: Phaser.Math.Vector2,
  goalWorld: Phaser.Math.Vector2,
): Phaser.Math.Vector2[] {
  const start = clampToWalkable(grid, worldToCell(startWorld, grid.cellSize));
  const goal = clampToWalkable(grid, worldToCell(goalWorld, grid.cellSize));

  if (start === undefined || goal === undefined) {
    return [];
  }

  const startIndex = toIndex(start.column, start.row, grid.width);
  const goalIndex = toIndex(goal.column, goal.row, grid.width);

  const openSet = new Set<number>([startIndex]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>([[startIndex, 0]]);
  const fScore = new Map<number, number>([[startIndex, heuristic(start, goal)]]);

  while (openSet.size > 0) {
    const current = getBestOpenNode(openSet, fScore);
    if (current === goalIndex) {
      return reconstructPath(cameFrom, current, grid);
    }

    openSet.delete(current);
    const currentCell = toCell(current, grid.width);

    for (const neighborCell of getNeighbors(currentCell, grid.width, grid.height)) {
      const neighborIndex = toIndex(neighborCell.column, neighborCell.row, grid.width);
      if (!isWalkable(grid, neighborCell.column, neighborCell.row)) {
        continue;
      }

      const tentativeG = (gScore.get(current) ?? Number.POSITIVE_INFINITY) +
        Phaser.Math.Distance.Between(currentCell.column, currentCell.row, neighborCell.column, neighborCell.row);

      if (tentativeG >= (gScore.get(neighborIndex) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      cameFrom.set(neighborIndex, current);
      gScore.set(neighborIndex, tentativeG);
      fScore.set(neighborIndex, tentativeG + heuristic(neighborCell, goal));
      openSet.add(neighborIndex);
    }
  }

  return [];
}

function reconstructPath(cameFrom: Map<number, number>, endIndex: number, grid: NavigationGrid): Phaser.Math.Vector2[] {
  const totalPath: number[] = [endIndex];
  let current = endIndex;

  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    totalPath.push(current);
  }

  totalPath.reverse();
  return totalPath.map((index) => {
    const cell = toCell(index, grid.width);
    return cellToWorld(cell.column, cell.row, grid.cellSize);
  });
}

function getBestOpenNode(openSet: Set<number>, fScore: Map<number, number>): number {
  let bestNode: number | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const node of openSet) {
    const score = fScore.get(node) ?? Number.POSITIVE_INFINITY;
    if (score < bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  return bestNode ?? [...openSet][0];
}

function getNeighbors(cell: GridCell, width: number, height: number): GridCell[] {
  const neighbors: GridCell[] = [];

  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dColumn = -1; dColumn <= 1; dColumn += 1) {
      if (dRow === 0 && dColumn === 0) {
        continue;
      }

      const nextColumn = cell.column + dColumn;
      const nextRow = cell.row + dRow;

      if (nextColumn < 0 || nextRow < 0 || nextColumn >= width || nextRow >= height) {
        continue;
      }

      neighbors.push({ column: nextColumn, row: nextRow });
    }
  }

  return neighbors;
}

function clampToWalkable(grid: NavigationGrid, cell: GridCell): GridCell | undefined {
  if (isWalkable(grid, cell.column, cell.row)) {
    return cell;
  }

  const maxRadius = Math.max(grid.width, grid.height);
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let row = cell.row - radius; row <= cell.row + radius; row += 1) {
      for (let column = cell.column - radius; column <= cell.column + radius; column += 1) {
        if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) {
          continue;
        }

        if (isWalkable(grid, column, row)) {
          return { column, row };
        }
      }
    }
  }

  return undefined;
}

function worldToCell(world: Phaser.Math.Vector2, cellSize: number): GridCell {
  return {
    column: Math.max(0, Math.floor(world.x / cellSize)),
    row: Math.max(0, Math.floor(world.y / cellSize)),
  };
}

function cellToWorld(column: number, row: number, cellSize: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2((column + 0.5) * cellSize, (row + 0.5) * cellSize);
}

function toIndex(column: number, row: number, width: number): number {
  return row * width + column;
}

function toCell(index: number, width: number): GridCell {
  return {
    column: index % width,
    row: Math.floor(index / width),
  };
}

function isWalkable(grid: NavigationGrid, column: number, row: number): boolean {
  return grid.walkable[toIndex(column, row, grid.width)] === true;
}

function heuristic(a: GridCell, b: GridCell): number {
  return Phaser.Math.Distance.Between(a.column, a.row, b.column, b.row);
}

function intersectsAnyWall(x: number, y: number, radius: number, walls: readonly Wall[]): boolean {
  for (const wall of walls) {
    const closestX = Phaser.Math.Clamp(x, wall.x, wall.x + wall.width);
    const closestY = Phaser.Math.Clamp(y, wall.y, wall.y + wall.height);
    const distanceSquared = Phaser.Math.Distance.Squared(x, y, closestX, closestY);

    if (distanceSquared < radius * radius) {
      return true;
    }
  }

  return false;
}
