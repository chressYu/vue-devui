import { ComponentPublicInstance, CSSProperties, defineComponent, isRef, nextTick, onBeforeUnmount, onMounted, reactive, ref, Ref, renderSlot, toRef, watch } from 'vue';
import { CommonOverlay } from './common-overlay';
import { overlayProps } from './overlay-types';
import { overlayVisible } from './utils';


/**
 * 
 */
export const FlexibleOverlay = defineComponent({
  name: 'DFlexibleOverlay',
  props: {
    origin: {
      type: Object as () => OriginOrDomRef,
      default: () => ({ x: 0, y: 0 })
    },
    position: {
      type: Object as () => ConnectionPosition,
      default: () => ({ originX: 'left', originY: 'top', overlayX: 'left', overlayY: 'top' })
    },
    ...overlayProps
  },
  setup(props, ctx) {
    const overlayRef = ref<Element | null>(null);
    const positionedStyle = reactive<CSSProperties>({ position: 'absolute' });

    const visible = overlayVisible(toRef(props, 'backgroundBlock'));

    // lift cycle
    onMounted(async () => {
      await nextTick();

      // 获取背景
      const overlay = overlayRef.value;
      if (!overlay) {
        return;
      }

      // 获取原点
      const origin = getOrigin(props.origin);
      if (!origin) {
        return;
      }

      const handleRectChange = (rect: DOMRect) => {
        // TODO: add optimize for throttle
        const point = calculatePosition(props.position, rect, origin);

        // set the current position style's value.
        // the current position style is a 'ref'. 
        positionedStyle.left = `${point.x}px`;
        positionedStyle.top = `${point.y}px`;
      };
      const handleChange = () => handleRectChange(overlay.getBoundingClientRect());

      flexibleLayoutChange(visible, handleChange);

      const resizeObserver = new ResizeObserver((entries) => {
        handleRectChange(entries[0].contentRect);
      });
      resizeObserver.observe(overlay as unknown as Element);
      onBeforeUnmount(() => {
        resizeObserver.disconnect();
      });

      if (origin instanceof Element) {
        // Only when the style changing, you can change
        // the position.
        const observer = new MutationObserver(handleChange);
        observer.observe(origin, {
          attributeFilter: ['style'],
        });
        onBeforeUnmount(() => {
          observer.disconnect();
        });
      }
    });

    const clickBackground = (event: Event) => {
      event.preventDefault();

      props.backdropClick?.();
      if (props.backdropClose) {
        visible.value = false;
      }
    };

    return (
      <CommonOverlay>
        <div
          v-show={visible.value}
          class={[
            'd-overlay-container',
            {
              [props.backgroundClass]: props.hasBackdrop,
              'd-overlay-container__disabled': !props.hasBackdrop
            }
          ]}
        >
          <div
            class={['d-overlay-panel', !props.hasBackdrop ? 'd-overlay-container__disabled' : '']}
            style={{ position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', display: 'flex' }}
            onClick={clickBackground}
          >
            <div
              ref={overlayRef}
              class="d-overlay"
              style={positionedStyle}
              onClick={event => event.cancelBubble = true}
            >
              {renderSlot(ctx.slots, 'default')}
            </div>
          </div>
        </div>
      </CommonOverlay>
    )
  }
});

function getElement(element: Element | { $el: Element; } | null): Element | null {
  if (element instanceof Element) {
    return element;
  }
  if (element && typeof element === 'object' && element.$el instanceof Element) {
    return element.$el;
  }
  return null;
}


interface ClientRect {
  bottom: number
  readonly height: number
  left: number
  right: number
  top: number
  readonly width: number
}

interface Point {
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  width?: number
  height?: number
}


type OriginOrDomRef = Element | Ref<ComponentPublicInstance | Element | undefined | null> | Rect;

type Origin = Element | Rect;

type HorizontalConnectionPos = 'left' | 'center' | 'right';
type VerticalConnectionPos = 'top' | 'center' | 'bottom';

interface ConnectionPosition {
  originX: HorizontalConnectionPos
  originY: VerticalConnectionPos
  overlayX: HorizontalConnectionPos
  overlayY: VerticalConnectionPos
}

function getOrigin(origin: OriginOrDomRef): Origin {
  // Check for Element so SVG elements are also supported.
  if (origin instanceof Element) {
    return origin;
  }

  if (isRef(origin)) {
    return getElement(origin.value);
  }

  // is point { x: number, y: number, width: number, height: number }
  return origin;
}


function calculatePosition(position: ConnectionPosition, panelOrRect: HTMLElement | DOMRect, origin: Origin): Point {
  // get overlay rect
  const originRect = getOriginRect(origin);

  // calculate the origin point
  const originPoint = getOriginPoint(originRect, position);

  let rect: DOMRect;
  if (panelOrRect instanceof HTMLElement) {
    rect = panelOrRect.getBoundingClientRect();
  } else {
    rect = panelOrRect;
  }

  // calculate the overlay anchor point
  return getOverlayPoint(originPoint, rect, position);
}


/** Returns the ClientRect of the current origin. */
function getOriginRect(origin: Origin): ClientRect {
  if (origin instanceof Element) {
    return origin.getBoundingClientRect();
  }
  // Origin is point
  const width = origin.width || 0;
  const height = origin.height || 0;

  // If the origin is a point, return a client rect as if it was a 0x0 element at the point.
  return {
    top: origin.y,
    bottom: origin.y + height,
    left: origin.x,
    right: origin.x + width,
    height,
    width
  };
}



function getOverlayPoint(originPoint: Point, rect: DOMRect, position: ConnectionPosition): Point {
  let x: number;
  const { width, height } = rect;
  if (position.overlayX == 'center') {
    x = originPoint.x - width / 2;
  } else {
    x = position.overlayX == 'left' ? originPoint.x : (originPoint.x - width);
  }

  let y: number;
  if (position.overlayY == 'center') {
    y = originPoint.y - (height / 2);
  } else {
    y = position.overlayY == 'top' ? originPoint.y : (originPoint.y - height);
  }

  return { x, y };
}


/**
 * Gets the (x, y) coordinate of a connection point on the origin based on a relative position.
 */
function getOriginPoint(originRect: ClientRect, position: ConnectionPosition): Point {
  let x: number;
  if (position.originX == 'center') {
    x = originRect.left + (originRect.width / 2);
  } else {
    const startX = originRect.left;
    const endX = originRect.right;
    x = position.originX == 'left' ? startX : endX;
  }

  let y: number;
  if (position.originY == 'center') {
    y = originRect.top + (originRect.height / 2);
  } else {
    y = position.originY == 'top' ? originRect.top : originRect.bottom;
  }

  return { x, y };
}


const flexibleLayoutChange = (visible: Ref<boolean>, event: (e?: Event) => void) => {
  watch(visible, (v, ov, onInvalidate) => {
    if (visible) {
      window.addEventListener('scroll', event, true);
      window.addEventListener('resize', event);
      window.addEventListener('orientationchange', event);
    } else {
      window.removeEventListener('scroll', event, true);
      window.removeEventListener('resize', event);
      window.removeEventListener('orientationchange', event);
    }
    onInvalidate(() => {
      window.removeEventListener('scroll', event, true);
      window.removeEventListener('resize', event);
      window.removeEventListener('orientationchange', event);
    });
  });
}