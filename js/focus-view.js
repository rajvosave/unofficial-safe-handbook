// After a route change, start the new page at the top and move focus to it.
// focus() alone only scrolls "as needed", which would leave the reader deep
// inside the next page after following a link from the bottom of a long one.
export function revealNewView(app, win = window) {
  win.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
