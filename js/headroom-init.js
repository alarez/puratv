document.addEventListener("DOMContentLoaded", function () {
  const menu = document.getElementById("menu");
  const headroom = new Headroom(menu, {
    tolerance: 5,
    offset: 100,
    classes: {
      initial: "headroom",
      pinned: "headroom--pinned",
      unpinned: "headroom--unpinned",
      top: "headroom--top",
      notTop: "headroom--not-top"
    }
  });
  headroom.init();
});
