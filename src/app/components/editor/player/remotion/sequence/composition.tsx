import { useAppSelector } from "@/app/store";
import { SequenceItem } from "./sequence-item";
import { MediaFile, TextElement } from "@/app/types";
import { useVideoConfig } from "remotion";
import React from "react";

const Composition = () => {
  const projectState = useAppSelector((state) => state.projectState);
  const { mediaFiles, textElements } = projectState;
  const { fps } = useVideoConfig();
  return (
    <>
      {mediaFiles.map((item: MediaFile) => {
        if (!item) return null;
        const trackItem = {
          ...item,
        } as MediaFile;
        return (
          <React.Fragment key={trackItem.id}>
            {SequenceItem[trackItem.type](trackItem, { fps })}
          </React.Fragment>
        );
      })}
      {textElements.map((item: TextElement) => {
        if (!item) return null;
        const trackItem = {
          ...item,
        } as TextElement;
        return (
          <React.Fragment key={trackItem.id}>
            {SequenceItem["text"](trackItem, { fps })}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Composition;
