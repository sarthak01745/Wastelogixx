import { forwardRef, type MouseEvent } from "react";
import { Link, type LinkProps, useNavigate } from "react-router-dom";

export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(({ onClick, to, replace, state, ...props }, ref) => {
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      props.target === "_blank" ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    const startViewTransition = (
      document as Document & {
        startViewTransition?: (callback: () => void) => void;
      }
    ).startViewTransition?.bind(document);

    if (startViewTransition) {
      event.preventDefault();
      startViewTransition(() => {
        navigate(to, { replace, state });
      });
    }
  };

  return <Link ref={ref} to={to} replace={replace} state={state} {...props} onClick={handleClick} />;
});

TransitionLink.displayName = "TransitionLink";
