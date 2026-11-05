// عرض رد المساعد بشكل مرتب: أسطر منفصلة، نقاط، عناوين، وخط عريض.
// يدعم صيغة بسيطة فقط (مثل Markdown المختصر) ويعرض كل شيء كنص آمن
// (بدون HTML)، لذلك لا يمكن حقن أي كود من خلال الرسائل.

// **نص** -> خط عريض
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts
    .filter((part) => part !== "")
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
      ) : (
        part.replace(/\*\*/g, "")
      )
    );
}

const BULLET = /^\s*(?:[-*•])\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let list = null;

  const closeList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    // سطر فارغ: فاصل بين الأقسام
    if (!line.trim()) {
      closeList();
      return;
    }

    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBERED);
    const heading = line.match(HEADING);

    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";

      if (!list || list.type !== type) {
        closeList();
        list = { type, items: [] };
      }

      list.items.push(bullet ? bullet[1] : numbered[2]);
      return;
    }

    closeList();

    if (heading) {
      blocks.push({ type: "heading", text: heading[1] });
      return;
    }

    blocks.push({ type: "p", text: line.trim() });
  });

  closeList();

  return (
    <div className="formatted-message">
      {blocks.map((block, index) => {
        const key = `b-${index}`;

        if (block.type === "ul" || block.type === "ol") {
          const ListTag = block.type;

          return (
            <ListTag key={key} className="fm-list">
              {block.items.map((item, i) => (
                <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "heading") {
          return (
            <p key={key} className="fm-heading">
              {renderInline(block.text.replace(/\*\*/g, ""), key)}
            </p>
          );
        }

        // سطر ينتهي بنقطتين (مثل "تفاصيل الفئات:") يُعرض كعنوان قسم
        const isSectionTitle = /[:：]$/.test(block.text) && block.text.length <= 60;

        return (
          <p key={key} className={isSectionTitle ? "fm-heading" : "fm-paragraph"}>
            {renderInline(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}

export default FormattedMessage;
