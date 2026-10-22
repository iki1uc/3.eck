try {
  const bc = new BroadcastChannel('iki1uc');
  bc.onmessage = (ev) => {
    const d = ev.data;
    if (d?.type === 'zauber' && d.pos) {
      const map = {1:'BIO', 2:'TEL', 3:'RAM', 4:'DRIVE', 5:'GEO', 6:'CTRL'};
      sortName = map[d.pos];
      log(`ZAUBER → Pos ${d.pos} · ${d.skill} · ${d.perm} · sort=${sortName}`);
      draw();
    }
  };
} catch(e) {}
