import { Request, Response } from "express";
import VideoFind from "../../../models/VideoFind";

export const getVideoFinds = async (req: Request, res: Response) => {
  try {
    const videos = await VideoFind.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: videos.length, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching video finds", error: (error as Error).message });
  }
};
