/* Arctic Dominion asset-resilience note: recurring SVG characters load locally and never leave a broken image placeholder. */
import { useState } from "react";
import { RecurringCharacter } from "./RecurringCharacter.jsx";

function chooseCharacter(className, fallbackClassName, alt) {
  const descriptor = `${className} ${fallbackClassName} ${alt}`.toLowerCase();
  if (/tiger/.test(descriptor)) return "tiger";
  if (/goat/.test(descriptor)) return "goat";
  if (/vulture/.test(descriptor)) return "vulture";
  if (/crow/.test(descriptor)) return "crow";
  if (/leopard/.test(descriptor)) return "leopard";
  if (/penguin/.test(descriptor)) return "penguin";
  if (/stone|seed|ruma/.test(descriptor)) return "mica";
  if (/fish/.test(descriptor)) return "fish";
  if (/king|crown|court/.test(descriptor)) return "court";
  if (/pilgrim|temple/.test(descriptor)) return "pilgrim";
  if (/guard|warrior/.test(descriptor)) return "guard";
  if (/score|tablan/.test(descriptor)) return "scorekeeper";
  if (/sige|guardian/.test(descriptor)) return "guardian";
  return "scout";
}

function chooseSide(className, fallbackClassName) {
  const descriptor = `${className} ${fallbackClassName}`.toLowerCase();
  return /coral|ember|red/.test(descriptor) ? "coral" : "aurora";
}

export function HeritageSticker({ src, alt = "", className = "", fallbackClassName = "", draggable = "false", character = true, ...props }) {
  const [failed, setFailed] = useState(!src);

  if (character) {
    return <RecurringCharacter {...props} className={className} kind={chooseCharacter(className, fallbackClassName, alt)} side={chooseSide(className, fallbackClassName)} label={alt} />;
  }

  if (failed) {
    return <span {...props} className={`${className} heritage-sticker-fallback ${fallbackClassName}`.trim()} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} />;
  }

  return (
    <img
      {...props}
      className={className}
      src={src}
      alt={alt}
      draggable={draggable}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
