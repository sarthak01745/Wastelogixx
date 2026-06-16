import { useNavigate, type NavigateOptions, type To } from "react-router-dom";

export const useSmoothNavigate = () => {
  const navigate = useNavigate();

  return (to: To, options?: NavigateOptions) => {
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (callback: () => void) => void;
      }
    ).startViewTransition?.bind(document);

    if (startViewTransition) {
      startViewTransition(() => {
        navigate(to, options);
      });
      return;
    }

    navigate(to, options);
  };
};
