export default function ReadOnlyNotice() {
  return (
    <div className="alert" style={{ background: "var(--brass-soft)", color: "#5C4720" }}>
      You're signed in as an ordinary member. You can view records, but only the treasurer can add or change them.
    </div>
  );
}
