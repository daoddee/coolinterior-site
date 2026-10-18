(() => {
  document.querySelectorAll('[data-youtube-id]').forEach(player => {
    const button = player.querySelector('button');
    button?.addEventListener('click', () => {
      const id = player.dataset.youtubeId;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
      // Only create the third-party player after an explicit request to play.
      document.querySelectorAll('.work-video-player iframe').forEach(frame => {
        frame.contentWindow?.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}), 'https://www.youtube-nocookie.com');
      });
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`;
      frame.title = button.getAttribute('aria-label').replace('Play ', '');
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(frame);
      frame.focus();
    });
  });
})();
