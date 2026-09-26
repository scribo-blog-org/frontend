'use client';

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useNavigate } from "@/navigation";

import { profilePathFromNick } from "../../../content/plainRichText";
import { registerMentionTransform } from "./MentionNode";

const MentionPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const navigate = useNavigate();

  useEffect(() => {
    return registerMentionTransform(editor);
  }, [editor]);

  useEffect(() => {
    const onClick = (event: any) => {
      if (editor.isEditable()) {
        return;
      }

      const target = event.target.closest(".mention");
      if (!target) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nick = (target.textContent || "").replace(/^@/, "");
      navigate(profilePathFromNick(nick));
    };

    return editor.registerRootListener((root: any, prevRoot: any) => {
      prevRoot?.removeEventListener("click", onClick);
      root?.addEventListener("click", onClick);
    });
  }, [editor, navigate]);

  return null;
};

export default MentionPlugin;
