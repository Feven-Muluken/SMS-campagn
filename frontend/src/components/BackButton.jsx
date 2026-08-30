import { useNavigate } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';

const BackButton = ({ fallbackPath = '/', label = 'Back' }) => {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="items-center bg-gray-200 border border-gray-200 rounded-full p-1 items-center gap-2 text-sm font-medium hover:bg-gray-300 focus:bg-gray-400 "
      // aria-label={label}
      // title={label}
    >
      <FiChevronLeft className="w-6 h-6" />
      {/* <span>{label}</span> */}
    </button>
  );
};

export default BackButton;
