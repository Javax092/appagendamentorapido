export function TabBar({ tabs, activeView, onChange }) {
  return (
    <nav className={`tabbar ${tabs.length > 4 ? "expanded" : ""}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeView === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
