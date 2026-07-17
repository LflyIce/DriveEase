import { onBeforeUnmount } from 'vue';

/**
 * 图表自动轮播：每 interval ms 依次 highlight + showTip 一个数据项；
 * mouseover 暂停、mouseout 恢复。组件卸载自动清理。
 */
export function useChartCarousel(getInstance: () => any) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let idx = -1;
  let paused = false;
  let boundIns: any = null;

  const onOver = () => {
    paused = true;
  };
  const onOut = () => {
    paused = false;
  };

  function start(count: number, interval = 2500) {
    stop();
    if (count <= 0) return;
    idx = -1;
    const tick = () => {
      if (paused) return;
      const ins = getInstance();
      if (!ins) return;
      if (idx >= 0) {
        ins.dispatchAction({ type: 'downplay', seriesIndex: 0, dataIndex: idx });
      }
      idx = (idx + 1) % count;
      ins.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: idx });
      ins.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx });
    };
    timer = setInterval(tick, interval);
    boundIns = getInstance();
    boundIns?.on('mouseover', onOver);
    boundIns?.on('mouseout', onOut);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined;
    boundIns?.off('mouseover', onOver);
    boundIns?.off('mouseout', onOut);
    boundIns = null;
  }

  onBeforeUnmount(stop);
  return { start, stop };
}
