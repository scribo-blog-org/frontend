// Log lists keep a sliding window of rows in memory: hundreds of expandable
// rows make scrolling janky. Rows that fall off the end the user is scrolling
// away from are dropped and loaded again when they scroll back.
export const LOG_WINDOW = 40;
// rows fetched per request; the window holds LOG_WINDOW / LOG_CHUNK of them
export const LOG_CHUNK = 10;
export const LOG_WINDOW_PAGES = LOG_WINDOW / LOG_CHUNK;
