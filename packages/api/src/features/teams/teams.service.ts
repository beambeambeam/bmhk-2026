import { createError } from "evlog";

import type { FileRepository } from "../files/files.repository";
import type { TeamAccessContext } from "../../core/auth";
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
  TeamAward,
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
  delete: (access: TeamAccessContext, id: string) => Promise<{ id: string }>;
  get: (access: TeamAccessContext, id: string) => Promise<TeamDetails>;
  list: (
    access: TeamAccessContext,
    pagination: { limit: number; offset: number },
  ) => Promise<TeamListResult>;
  setAward: (access: TeamAccessContext, id: string, award: TeamAward) => Promise<Team>;
  update: (access: TeamAccessContext, id: string, data: UpdateTeamData) => Promise<Team>;
  uploadImage: (input: {
    access: TeamAccessContext;
    file: File;
    id: string;
    log: FileServiceLog;
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
    delete: async (access, id) => {
      const deleted = await repository.delete(access, id);
      if (!deleted) {
        throw createTeamNotFoundError();
      }

      return { id };
    },
    get: async (access, id) => {
      const team = await repository.findById(access, id);
      if (!team) {
        throw createTeamNotFoundError();
      }

      return {
        ...team,
        image: team.image === null ? null : await toPublicFileWithUrl(team.image, storage),
      };
    },
    list: async (access, pagination) => {
      const result = await repository.list(access, pagination);
      return {
        data: result.data,
        pagination: createTeamListPagination({
          ...pagination,
          total: result.total,
        }),
      };
    },
    setAward: async (access, id, award) => {
      const team = await repository.update(access, id, { award });
      if (!team) {
        throw createTeamNotFoundError();
      }

      return team;
    },
    update: async (access, id, data) => {
      const team = await repository.update(access, id, data);
      if (!team) {
        throw createTeamNotFoundError();
      }

      return team;
    },
    uploadImage: async ({ access, file, id, log }) => {
      const existingTeam = await repository.findById(access, id);
      if (!existingTeam) {
        throw createTeamNotFoundError();
      }

      const storedFile = await storeUploadedFile({
        file,
        keyPrefix: `teams/${id}/images`,
        kind: "image",
        storage,
        uploadedBy: access.actorId,
      });
      const result = await persistUploadedFile({
        data: storedFile,
        log,
        persist: async (data) => {
          const replacement = await repository.replaceImage(access, id, data);
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
      });

      return { file: storedFile, team: result.team };
    },
  };
}
