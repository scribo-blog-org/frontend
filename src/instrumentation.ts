export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    if (process.env.NEXT_PHASE === "phase-production-build") return;

    const port = process.env.PORT ?? "3000";
    console.log(`frontend ready port=${port}`);
}
