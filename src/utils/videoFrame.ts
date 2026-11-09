export function captureVideoFrame(file: File): Promise<string | null> {
    return new Promise((resolve) => {
        if (typeof document === 'undefined') {
            resolve(null);
            return;
        }

        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.muted = true;
        video.preload = 'metadata';
        video.playsInline = true;

        const finish = (result: string | null) => {
            URL.revokeObjectURL(url);
            video.removeAttribute('src');
            video.load();
            resolve(result);
        };

        const timeout = window.setTimeout(() => finish(null), 8000);

        video.onloadeddata = () => {
            const target = Math.min(1, (video.duration || 0) / 2);
            video.currentTime = Number.isFinite(target) ? target : 0;
        };

        video.onseeked = () => {
            window.clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, 480 / (video.videoWidth || 480));
                canvas.width = Math.max(
                    1,
                    Math.round(video.videoWidth * scale),
                );
                canvas.height = Math.max(
                    1,
                    Math.round(video.videoHeight * scale),
                );
                canvas
                    .getContext('2d')
                    ?.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(url);
                        resolve(blob ? URL.createObjectURL(blob) : null);
                    },
                    'image/jpeg',
                    0.7,
                );
            } catch {
                finish(null);
            }
        };

        video.onerror = () => {
            window.clearTimeout(timeout);
            finish(null);
        };

        video.src = url;
    });
}
