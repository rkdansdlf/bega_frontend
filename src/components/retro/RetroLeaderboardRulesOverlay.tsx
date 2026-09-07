interface RetroLeaderboardRulesOverlayProps {
  onClose: () => void;
}

const rulesOverlayStyles = `
  .retro-leaderboard-rules-close {
    min-height: 44px;
    min-width: 96px;
    border: 2px solid #fff;
    border-radius: 4px;
    background: #b91c1c;
    color: #fff;
    padding: 10px 24px;
    font-family: 'Galmuri11', 'Galmuri9', sans-serif;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 4px 4px 0 #000;
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    transition: transform 0.1s ease, box-shadow 0.1s ease, color 0.1s ease, border-color 0.1s ease;
  }

  .retro-leaderboard-rules-close:hover {
    transform: translate(-2px, -2px);
    border-color: #ffff00;
    color: #ffff00;
    box-shadow: 6px 6px 0 #000;
  }

  .retro-leaderboard-rules-close:focus-visible {
    outline: 3px solid #67e8f9;
    outline-offset: 3px;
  }

  .retro-leaderboard-rules-close:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #000;
  }
`;

const rulesCellStyle = {
  border: '2px solid #fff',
  overflowWrap: 'anywhere',
  padding: 'clamp(6px, 2vw, 10px)',
  textAlign: 'center',
} as const;

export default function RetroLeaderboardRulesOverlay({
  onClose,
}: RetroLeaderboardRulesOverlayProps) {
  return (
    <div
      data-testid="retro-leaderboard-rules-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 'clamp(12px, 4vw, 20px)',
        borderRadius: '8px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <style>{rulesOverlayStyles}</style>
      <h2
        style={{
          color: '#ffd700',
          fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
          margin: '0 0 20px',
          textShadow: '2px 2px 0 #000',
        }}
      >
        점수 산정 규칙
      </h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          color: '#fff',
          fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
          fontSize: 'clamp(11px, 3.5vw, 14px)',
          marginBottom: '20px',
          tableLayout: 'fixed',
        }}
      >
        <thead>
          <tr>
            <th style={{ ...rulesCellStyle, background: '#333', color: '#ffd700' }}>항목</th>
            <th style={{ ...rulesCellStyle, background: '#333', color: '#ffd700' }}>점수</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['승리팀 적중', '+100점'],
            ['연승 보너스', '기본점수 × 연승'],
            ['이변 예측 (UPSET)', '+50점'],
            ['퍼펙트 데이', '+200점'],
            ['📸 좌석 시야 공유', '+50점 (첫 기여 +100점)'],
          ].map(([label, value]) => (
            <tr key={label}>
              <td style={rulesCellStyle}>{label}</td>
              <td style={rulesCellStyle}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        style={{
          color: '#aaa',
          fontSize: '12px',
          fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
          margin: '0 0 20px',
          textAlign: 'center',
          lineHeight: 1.7,
        }}
      >
        * 연승이 끊기면 연승 보너스는 초기화됩니다.
        <br />
        * 파워업 아이템 사용 시 추가 배율이 적용됩니다.
        <br />
        * 다이어리에서 좌석 시야 사진을 올리면 포인트를 획득합니다.
      </p>
      <button
        type="button"
        className="retro-leaderboard-rules-close"
        data-testid="retro-leaderboard-rules-close"
        onClick={onClose}
      >
        닫기
      </button>
    </div>
  );
}
