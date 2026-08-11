import { createError } from "evlog";

import type { FileRepository } from "../files/files.repository";
import type { CreateStoredFileData } from "../files/files.schema";
import type { FileServiceLog } from "../files/files.service";
import {
  cleanupReplacedFile,
  persistUploadedFile,
  storeUploadedFile,
  toPublicFileWithUrl,
} from "../files/files.service";
import type { FileStorage } from "../files/files.storage";
import type { TeamRepository } from "./teams.repository";
import { createTeamAlreadyExistsError } from "./teams.errors";
import type {
  CreateTeamData,
  Team,
  TeamDetails,
  TeamListPagination,
  TeamListResult,
  UpdateTeamData,
} from "./teams.schema";

export interface TeamImageUploadResult {
  file: CreateStoredFileData;
  team: Team;
}

export interface TeamService {
  create: (userId: string, data: CreateTeamData) => Promise<Team>;
  delete: (userId: string, id: string) => Promise<{ id: string }>;
  get: (userId: string, id: string) => Promise<TeamDetails>;
  list: (userId: string, pagination: { limit: number; offset: number }) => Promise<TeamListResult>;
  update: (userId: string, id: string, data: UpdateTeamData) => Promise<Team>;
  uploadImage: (input: {
    file: File;
    id: string;
    log: FileServiceLog;
    userId: string;
  }) => Promise<TeamImageUploadResult>;
}

export function createTeamNotFoundError() {
  return createError({
    code: "TEAM_NOT_FOUND",
    fix: "Check the team ID and try again",
    message: "Team not found",
    status: 404,
    why: "No team owned by the current user matches this ID",
  });
}

export function createTeamListPagination({
  limit,
  offset,
  total,
}: {
  limit: number;
  offset: number;
  total: number;
}): TeamListPagination {
  return {
    currentPage: Math.floor(offset / limit) + 1,
    limit,
    nextOffset: offset + limit < total ? offset + limit : null,
    offset,
    previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function createTeamService(
  repository: TeamRepository,
  storage: FileStorage,
  fileRepository: FileRepository,
): TeamService {
  return {
    create: async (userId, data) => {
      const existingTeam = await repository.findByUserId(userId);
      if (existingTeam) {
        throw createTeamAlreadyExistsError();
      }

      return await repository.create(userId, data);
    },
    delete: async (userId, id) => {
      const deleted = await repository.delete(userId, id);
      if (!deleted) {
        throw createTeamNotFoundError();
      }

      return { id };
    },
    get: async (userId, id) => {
      const team = await repository.findById(userId, id);
      if (!team) {
        throw createTeamNotFoundError();
      }

      return {
        ...team,
        image: team.image === null ? null : await toPublicFileWithUrl(team.image, storage),
      };
    },
    list: async (userId, pagination) => {
      const result = await repository.list(userId, pagination);
      return {
        data: result.data,
        pagination: createTeamListPagination({
          ...pagination,
          total: result.total,
        }),
      };
    },
    update: async (userId, id, data) => {
      const team = await repository.update(userId, id, data);
      if (!team) {
        throw createTeamNotFoundError();
      }

      return team;
    },
    uploadImage: async ({ file, id, log, userId }) => {
      const existingTeam = await repository.findById(userId, id);
      if (!existingTeam) {
        throw createTeamNotFoundError();
      }

      const storedFile = await storeUploadedFile({
        file,
        keyPrefix: `teams/${id}/images`,
        kind: "image",
        storage,
        uploadedBy: userId,
      });
      const result = await persistUploadedFile({
        data: storedFile,
        log,
        persist: async (data) => {
          const replacement = await repository.replaceImage(userId, id, data);
          if (replacement === null) {
            throw createTeamNotFoundError();
          }

          return replacement;
        },
        storage,
      });
      await cleanupReplacedFile({
        file: result.previous,
        log,
        repository: fileRepository,
        storage,
        userId,
      });

      return { file: storedFile, team: result.team };
    },
  };
}
