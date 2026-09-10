declare module '@mediapipe/tasks-vision' {
  export class FaceLandmarker {
    static createFromOptions(vision: any, options: any): Promise<FaceLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestamp: number): any;
    close(): void;
  }
  export class FilesetResolver {
    static forVisionTasks(url: string): Promise<any>;
  }
}
