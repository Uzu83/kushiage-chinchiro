import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { ArrowUpRight, Check, ChevronDown, CircleHelp, Github, Hand, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { DiceSceneHandle } from './components/DiceScene';
const DiceScene = lazy(() => import('./components/DiceScene'));
import { DieIcon, Effects, MegaJockey } from './components/Effects';
import { addResult, EMPTY_STATS, OUTCOMES, paymentFor, randomDice, roll, type Die, type OutcomeId, type RollResult, type Stats } from './lib/chinchiro';
import { SoundEngine } from './lib/audio';

type TestRoll = OutcomeId | null;
const yekanji = (n: number) => n.toLocaleString('ja-JP');

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function forcedDice(testRoll: TestRoll): [Die, Die] | null {
  const options: Record<Exclude<OutcomeId, 'yamada'> | 'yamada', [Die, Die]> = { yamada: [1, 1], free: [6, 6], half: [2, 4], double: [1, 2] };
  return testRoll ? options[testRoll] : null;
}

function App() {
  const scene = useRef<DiceSceneHandle>(null);
  const sound = useRef<SoundEngine | null>(null);
  if (!sound.current) sound.current = new SoundEngine();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const [muted, setMuted] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [result, setResult] = useState<RollResult | null>(null);
  const [priceInput, setPriceInput] = useState('500');
  const price = Math.max(0, Math.min(999999, Number(priceInput) || 0));
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [sequence, setSequence] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [notification, setNotification] = useState('');
  const [effect, setEffect] = useState<OutcomeId | null>(null);
  const [shakeSupported, setShakeSupported] = useState(false);
  const handleRoll = useRef<() => void>(() => undefined);

  useEffect(() => {
    setShakeSupported(window.matchMedia('(pointer: coarse)').matches);
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || (event.target instanceof HTMLElement && ['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SUMMARY'].includes(event.target.tagName))) return;
      event.preventDefault(); handleRoll.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!shakeSupported) return;
    let last = 0;
    let lastMovement = 0;
    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const strength = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const now = performance.now();
      if (strength > 24 && now - last > 5000 && now - lastMovement > 700) {
        last = now; handleRoll.current();
      }
      if (strength > 19) lastMovement = now;
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [shakeSupported]);

  useEffect(() => {
    const start = () => setSceneReady(true);
    const timer = setTimeout(start, 1100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  async function startRoll() {
    if (rolling || !sceneReady) return;
    setRolling(true); setResult(null); setEffect(null); setResetConfirm(false); setNotification('');
    await sound.current?.unlock();
    const testParam = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('force') as TestRoll : null;
    const forced = forcedDice(testParam);
    const dice = forced ?? randomDice();
    const next = roll(dice);
    sound.current?.play('throw');
    await scene.current?.roll(dice);
    timeout.current = setTimeout(() => {
      setResult(next); setStats(previous => addResult(previous, next, price));
      setSequence(previous => previous + 1); setEffect(next.id); setRolling(false);
      sound.current?.play(next.id);
    }, reducedMotion ? 100 : 160);
  }
  handleRoll.current = startRoll;

  const onPriceChange = (value: string) => {
    if (!/^\d*$/.test(value)) return;
    setPriceInput(value.slice(0, 6));
    if (stats.rolls > 0) setNotification('次の1投から、この定価で記録します。');
  };

  function toggleMute() {
    const enabled = sound.current!.toggle();
    setMuted(!enabled);
  }

  return (
    <div className={`app-shell ${rolling ? 'is-rolling' : ''} ${result?.id === 'yamada' ? 'is-jackpot' : ''} ${result ? 'has-result' : ''}`}>
      <a className="skip-link" href="#roll-button">サイコロを振るボタンへ進む</a>
      <header className="site-header">
        <a className="brand" href="#">
          <span className="brand-mark"><DieIcon /></span>
          <span className="brand-name">串揚げチンチロ<span>シミュレーター</span></span>
        </a>
        <nav aria-label="メインメニュー">
          <a href="#rules"><CircleHelp size={17} /><span>ルール</span></a>
          <button onClick={toggleMute} className="sound-button" aria-label={muted ? '効果音をオンにする' : '効果音をオフにする'} aria-pressed={!muted}>
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}<span>{muted ? '音 OFF' : '音 ON'}</span>
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow"><span /> 今日の運勢、丼に託せ。 <span /></p>
          <h1 id="hero-title">めくるめく、<span>出目</span>のドラマ。</h1>
          <p className="hero-copy">2つのサイコロ、勝負は1回。<br />「山」と「田」が揃えば、メガジョッキ無料！</p>
        </section>

        <section className={`game-panel outcome-${result?.id ?? 'idle'}`} aria-label="チンチロゲーム">
          <div className="texture" />
          <div className="panel-topline">
            <span className="round-label"><span className="live-dot" /> {rolling ? 'チンチロチンチロ…！' : result ? `第 ${stats.rolls} 投の結果` : 'いざ、勝負の一投'}</span>
            <span className="single-roll"><DieIcon /> 2D6 / ONE ROLL</span>
          </div>
          <div className="scene-wrap">
            <span className="orbit orbit-1" /><span className="orbit orbit-2" />
            {sceneReady && <Suspense fallback={<div className="dice-loading" aria-label="3Dの丼を準備中"><span>山</span><span>田</span></div>}><DiceScene ref={scene} onClack={() => sound.current?.play('clack')} reducedMotion={reducedMotion} /></Suspense>}
            {!sceneReady && <div className="dice-loading" aria-label="3Dの丼を準備中"><span>山</span><span>田</span></div>}

            {!result && !rolling && <div className="scene-caption"><span className="tap-icon"><Hand size={16} /></span> 下のボタンを押して！</div>}
            {rolling && <div className="rolling-status" role="status"><span className="loading-dots"><i /><i /><i /></span> 出目は…？</div>}
            {result && (
              <div className={`result-card result-${result.id}`} key={`${sequence}-${result.id}`}>
                {result.id === 'yamada' && <div className="jackpot-rays" />}
                <div className="result-kicker">{result.id === 'yamada' ? '✦ 大当たり！ ✦' : result.id === 'free' ? '✦ おめでとう！ ✦' : result.id === 'half' ? 'そこそこの幸運' : 'あちゃー…！'}</div>
                <div className="dice-readout">
                  <span>{result.dice[0] === 1 ? '山' : result.dice[0]}</span><span className="dice-cross">×</span><span>{result.dice[1] === 1 ? '田' : result.dice[1]}</span>
                  <span className="dice-total">合計 {result.dice[0] + result.dice[1]}</span>
                </div>
                <h2>{result.id === 'yamada' ? <>山田<span>きたー！</span></> : <>{result.shortTitle}</>}</h2>
                <div className="result-drink">{result.id === 'yamada' || result.id === 'double' ? 'メガジョッキ' : '通常ジョッキ'}<strong>{result.id === 'double' ? '倍量・倍額' : result.id === 'half' ? '半額' : '1杯無料'}</strong></div>
                <div className={`payment ${result.id === 'double' ? 'payment-loss' : ''}`}>
                  <span>お支払い</span><strong><small>¥</small>{yekanji(paymentFor(price, result))}</strong><span className="payment-strike">定価 ¥{yekanji(price)}</span>
                </div>
                {result.id === 'yamada' && <MegaJockey />}
                <p className="result-message">{result.id === 'yamada' ? '最高の引き！今日はついてる！' : result.id === 'free' ? 'ツイてる！おいしい1杯をどうぞ。' : result.id === 'half' ? '半額は半額。素直にうれしい。' : 'サイコロとは、そういうものです…。'}</p>
              </div>
            )}
          </div>

          <div className="game-controls">
            <button id="roll-button" className="roll-button" onClick={startRoll} disabled={rolling || priceInput === '' || !sceneReady}>
              {rolling ? <span className="button-dice"><DieIcon /></span> : <DieIcon />}
              <span>{rolling ? 'ゴロゴロゴロ…' : result ? 'もう一度、勝負！' : 'サイコロを振る！'}</span>
              {!rolling && <span className="button-shine" />}
            </button>
            <p className="roll-hint"><span className="desktop-hint"><kbd>SPACE</kbd> でも振れます</span><span>{shakeSupported ? 'スマホを振ってもOK' : 'タップで何度でも'}</span></p>
          </div>
          <div className="price-setting">
            <label htmlFor="list-price">定価</label><div className="price-input"><span>¥</span><input id="list-price" inputMode="numeric" type="text" pattern="[0-9]*" maxLength={6} value={priceInput} onChange={e => onPriceChange(e.target.value)} aria-describedby="price-help" /></div><span id="price-help">の1杯で勝負 <span className="price-note">※金額は自由に設定</span></span>
          </div>
        </section>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{result ? `出目は${result.dice[0]}と${result.dice[1]}。${result.title}。定価${price}円の場合、お支払いは${paymentFor(price, result)}円です。` : rolling ? 'サイコロを振っています。' : ''}</div>
        <p className="inline-notice" aria-live="polite">{notification}</p>

        <section className="ledger" aria-labelledby="ledger-title">
          <div className="section-heading"><div><p className="mini-eyebrow">YOUR SCOREBOARD</p><h2 id="ledger-title">わたしの戦績</h2></div><span className="not-saved">この画面だけの記録</span></div>
          {stats.rolls === 0 ? (
            <div className="empty-ledger"><span className="small-dot" /> 最初の出目を記録しよう。履歴や個人情報は保存されません。</div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat"><span>チャレンジ</span><strong>{stats.rolls}<small>回</small></strong></div>
                <div className="stat"><span>累計のお支払い</span><strong>¥{yekanji(stats.totalPayment)}</strong></div>
                <div className={`stat ${stats.totalListPrice >= stats.totalPayment ? 'saving' : 'loss'}`}><span>{stats.totalListPrice >= stats.totalPayment ? 'トータルお得額' : 'トータル増額'}</span><strong>{stats.totalListPrice < stats.totalPayment ? '+' : '−'}¥{yekanji(Math.abs(stats.totalListPrice - stats.totalPayment))}</strong></div>
              </div>
              <div className="score-breakdown" aria-label="結果の内訳">
                {(['yamada', 'free', 'half', 'double'] as const).map(id => <div key={id}><span className={`score-dot dot-${id}`} /><span>{OUTCOMES[id].shortTitle.replace(/！|…/g, '')}</span><strong>{stats.counts[id]}<small>回</small></strong></div>)}
              </div>
              <button className="reset-button" onClick={() => resetConfirm ? (setStats(EMPTY_STATS), setResetConfirm(false)) : setResetConfirm(true)}>{resetConfirm ? <><Check size={14} /> もう一度押すと消去</> : <><RotateCcw size={14} /> 戦績をリセット</>}</button>
            </>
          )}
        </section>

        <section id="rules" className="rules-section" aria-labelledby="rules-title">
          <div className="section-heading"><div><p className="mini-eyebrow">THE RULES</p><h2 id="rules-title">出目で、運命が決まる。</h2></div><span className="stamp">勝負は<br />一回！</span></div>
          <p className="rules-intro">2つのサイコロを1回だけ振ります。「山」も「田」も、数字の「1」です。</p>
          <div className="rules-grid">
            <article className="rule-card featured"><div className="rule-probability">約2.8<span>%</span><small>1 / 36</small></div><div className="rule-dice"><span>山</span><span>田</span></div><div className="rule-copy"><p className="rule-tag">大当たり</p><h3>山田</h3><p>メガジョッキ<br /><strong>1杯無料</strong></p></div></article>
            <article className="rule-card free"><div className="rule-probability">約13.9<span>%</span><small>5 / 36</small></div><div className="rule-dice pips"><span><i>⚄</i></span><span><i>⚄</i></span></div><div className="rule-copy"><p className="rule-tag">ゾロ目</p><h3>2〜6のゾロ目</h3><p>通常ジョッキ<br /><strong>1杯無料</strong></p></div></article>
            <article className="rule-card half"><div className="rule-probability">約33.3<span>%</span><small>12 / 36</small></div><div className="rule-dice pips"><span>⚂</span><span>⚂</span></div><div className="rule-copy"><p className="rule-tag">ゾロ目以外</p><h3>合計が偶数</h3><p>通常ジョッキ<br /><strong>半額</strong></p></div></article>
            <article className="rule-card double"><div className="rule-probability">50<span>%</span><small>18 / 36</small></div><div className="rule-dice pips"><span>⚀</span><span>⚁</span></div><div className="rule-copy"><p className="rule-tag">残念</p><h3>合計が奇数</h3><p>メガジョッキ<br /><strong>倍量・倍額</strong></p></div></article>
          </div>
          <details className="rule-details" open={showRules} onToggle={event => setShowRules(event.currentTarget.open)}>
            <summary><span><CircleHelp size={17} /> 判定の優先順位と、ちょっと残酷な真実</span><ChevronDown size={18} /></summary>
            <div className="detail-content"><p>「山田」→「2〜6のゾロ目」→「偶数」→「奇数」の順で判定。山田以外のゾロ目は、合計が偶数でも「1杯無料」です。</p><div className="math-note"><span>知ってた？</span><p>支払額の期待値は定価の<strong>約1.17倍（7/6）</strong>。つい振りたくなるチンチロだけど、夢中になりすぎにはご注意を。</p></div></div>
          </details>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><DieIcon /><span>串揚げチンチロシミュレーター</span></div>
        <p className="disclaimer">当サイトは非公式のファンメイドシミュレーターです。実在する店舗・企業とは一切関係ありません。<br />実際のルール・提供内容・対象メニューは、各店舗の案内を優先してください。</p>
        <div className="age-notice"><span>20</span><strong>お酒は20歳になってから。</strong><small>飲酒運転は、法律で禁止されています。</small></div>
        <div className="footer-bottom"><span>COOKIES · ADS · TRACKING <strong>NONE</strong></span><a href="https://github.com/Uzu83/kushiage-chinchiro" target="_blank" rel="noreferrer"><Github size={16} /> OSS / MIT <ArrowUpRight size={14} /></a></div>
      </footer>
      <Effects outcome={effect} sequence={sequence} reduced={reducedMotion} />
    </div>
  );
}

export default App;
