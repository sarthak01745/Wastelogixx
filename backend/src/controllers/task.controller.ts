import type { Request, Response } from "express";
import { TaskService } from "../services/task.service";

export class TaskController {
  static async planRoute(req: Request, res: Response) {
    const result = await TaskService.planRoute(req.body);
    res.status(200).json(result);
  }

  static async create(req: Request, res: Response) {
    const result = await TaskService.create(req.user!.id, req.body);
    res.status(201).json(result);
  }

  static async list(req: Request, res: Response) {
    const result =
      req.user!.role === "ADMIN"
        ? await TaskService.listForAdmin()
        : await TaskService.listForDriver(req.user!.id);

    res.status(200).json(result);
  }

  static async start(req: Request, res: Response) {
    const result = await TaskService.start(String(req.params.taskId), req.user!);
    res.status(200).json(result);
  }

  static async complete(req: Request, res: Response) {
    const result = await TaskService.complete(String(req.params.taskId), req.user!);
    res.status(200).json(result);
  }

  static async replay(req: Request, res: Response) {
    const result = await TaskService.replay(String(req.params.taskId), req.user!);
    res.status(200).json(result);
  }
}
