import {dateUtil} from "../modules";
import { MonitorDataField } from "../Monitors";

// save/restore cursor and tooltip state across re-inits
let cursLeft = -100;
let cursTop = -100;

const colors = MonitorDataField.levels.map(level => [level.min, level.color]) as Array<[number, string]>;
export const uPlotCursorConfig = {
  set: (left: number, top: number) => {
    cursLeft = left;
    cursTop = top;
  },
  get: (): uPlot.Cursor => ({
    left: cursLeft,
    top: cursTop,
    //x: false,
    y: false,
    points: {
      size: 7,
      fill: (u: uPlot, sIdx: number) => {
        const xIdx = u.cursor.idxs![sIdx];

        if (xIdx != null && u.series.length >= 2 && sIdx === 1) {
          const val = u.data[sIdx][xIdx]!;

          for (let i = colors.length - 1; i >= 0; i--) {
            const stop = colors[i];

            if (val >= stop[0]) {
              return `#${ stop[1] }`;
            }
          }
        }

        const stroke = u.series[sIdx].stroke! as (u: uPlot, sIdx: number) => string | CanvasGradient;
        return stroke(u, sIdx);
      }
    }
  }),
};

const ttContainerStyles = {
  pointerEvents: "none",
  whiteSpace: "nowrap",
  position: "absolute",
  backgroundColor: "white",
  zIndex: "100"
};

const ttHeaderStyles = {
  textAlign: "center",
  backgroundColor: "#f5f5f5",
  fontWeight: "600",
  fontSize: ".8rem",
  padding: ".5rem"
};

const ttLineItemStyles = {
  margin: ".5rem",
  fontSize: ".9rem"
};

export function tooltipsPlugin() {
  let ttContainer: HTMLDivElement;
  let ttHeader: HTMLParagraphElement;
  let seriesList: Array<HTMLParagraphElement | undefined>;

  function init(u: uPlot, opts: uPlot.Options) {
    let over = u.over;

    ttHeader = document.createElement("p");
    ttHeader.classList.add("card-header");
    Object.assign(ttHeader.style, ttHeaderStyles);

    ttContainer = document.createElement("div");
    ttContainer.classList.add("card");
    Object.assign(ttContainer.style, ttContainerStyles);
    ttContainer.appendChild(ttHeader);

    over.appendChild(ttContainer);

    seriesList = opts.series.map((s, i) => {
      if (i === 0) return;

      const stroke = s.stroke! as (u: uPlot, sIdx: number) => string | CanvasGradient;
      const line = document.createElement("p");

      Object.assign(line.style, ttLineItemStyles);
      line.style.color = stroke(u, i) as string;

      if (i === 1) {
        line.style.fontWeight = "600";
      }

      ttContainer.appendChild(line);

      return line;
    });

    function hideTips() {
      ttContainer.style.display = "none";
      seriesList.forEach((tt, i) => {
        if (i == 0) return;

        tt!.style.display = "none";
      });
    }

    function showTips() {
      ttContainer.style.display = "block";
      seriesList.forEach((line, i) => {
        if (i == 0) return;

        let s = u.series[i];
        line!.style.display = s.show ? "block" : "none";
      });
    }

    over.addEventListener("mouseleave", () => {
      if (!u.cursor.lock) {
      //	u.setCursor({left: -10, top: -10});
        hideTips();
      }
    });

    over.addEventListener("mouseenter", () => {
      showTips();
    });

    if (u.cursor.left! < 0)
      hideTips();
    else
      showTips();
  }

  function setCursor(u: uPlot) {
    const {left, top, idx} = u.cursor;

    uPlotCursorConfig.set(left!, top!);

    ttContainer.style.left = `${ left! + 15 }px`;
    ttContainer.style.top = top + "px";

    seriesList.forEach((tt, i) => {
      if (i == 0) return;

      let s = u.series[i];

      if (s.show) {
        let xVal = u.data[0][idx as number];
        let yVal = u.data[i][idx as number]!;

        let label = u.series[i].label;
        label = label?.substring(label.indexOf("(") + 1, label.indexOf(")")) || label;

        ttHeader.textContent = dateUtil.$prettyPrint(dateUtil.unix(xVal));
        tt!.textContent = `${ label }: ${ yVal }`;
      }
    });
  }

  return {
    hooks: {
      init,
      setCursor,
    },
  };
}
