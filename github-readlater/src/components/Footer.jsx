import { FaGithub, FaHeart } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-github-dark text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="flex items-center justify-center md:justify-start">
              <span>GitHub ReadLater</span>
              <span className="mx-2">•</span>
              <span>Save repositories for later reference</span>
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
            >
              <FaGithub className="text-xl" />
            </a>
            
            <p className="flex items-center">
              <span>Made with</span>
              <FaHeart className="text-red-500 mx-1" />
              <span>for developers</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;