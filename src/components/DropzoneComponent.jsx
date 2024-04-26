import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import config from "./../config.json";
import { Circles } from "react-loading-icons";

const baseStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px",
  borderWidth: 2,
  borderRadius: 2,
  borderColor: "#eeeeee",
  borderStyle: "dashed",
  backgroundColor: "#9daaf2",
  color: "#ff6a3d",
  transition: "border .3s ease-in-out",
  marginBottom: 20,
};

const activeStyle = {
  borderColor: "#2196f3",
};

const acceptStyle = {
  borderColor: "#00e676",
};

const rejectStyle = {
  borderColor: "#ff1744",
};

function DropzoneComponent(props) {
  const [files, setFiles] = useState([]);
  const [fileLinks, setFilelinks] = useState([]);
  const [fileLocation, setFileLocation] = useState();
  const [parsedFile, setParsedFile] = useState();
  const [isLoadingLinks, setIsLoadingLinks] = useState();
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  let fetchInterval = useRef();

  console.log("Parsed file: " + parsedFile);
  console.log("File location: " + fileLocation);

  const onDrop = useCallback((acceptedFiles) => {
    setFilelinks([]);
    setFiles(
      acceptedFiles.map((file) => {
        uploadFile(file);
        return file;
      })
    );
  }, []);

  useEffect(() => {
    console.log("Use Effect location: " + fileLocation);
    if (fileLocation) {
      console.log("filelocation In", fileLocation);
      if (isLoadingFile) {
        fetchInterval.current = setInterval(fetchCeleryData, 2000);
      }
    }
  }, [fileLocation]);

  const fetchCeleryData = () => {
    const url = config["PARSER_URL"] + fileLocation;
    var myHeaders = new Headers();
    myHeaders.append("Pragma", "no-cache");
    myHeaders.append("Cache-Control", "no-cache");
    myHeaders.append("Connection", "keep-alive");

    fetch(url, {
      method: "GET",
      header: myHeaders,
    })
      .then((response) => console.log(response.status) || response)
      .then((response) => {
        if (response.status === 200) {
          console.log(response);
          console.log("200 retrieving response");
          return response.json();
        }
      })
      .then((response) => {
        console.log("Response json", response);
        if (response.state === "SUCCESS") {
          setParsedFile(response["result"]);
          setIsLoadingFile(false);
          clearInterval(fetchInterval.current);
        }
      });
  };

  useEffect(() => {
    if (files.length === fileLinks.length) setIsLoadingLinks(false);
    else setIsLoadingLinks(true);
  }, [files, fileLinks]);

  const uploadFile = (file) => {
    let formData = new FormData();
    formData.append("file", file);

    fetch("https://dps.report/uploadContent?json=1&detailedwvw=true", {
      method: "POST",
      body: formData,
    })
      .then((response) => console.log(response.status) || response)
      .then((response) => {
        if (response.status === 200) {
          console.log("200 sending response");
          console.log(response);
          return response.json();
        }
      })
      .then((response) => {
        // let data = response.json();
        console.log("Last then");
        console.log(response);
        console.log(response["permalink"]);
        setFilelinks((fileLinks) => [...fileLinks, response["permalink"]]);
        console.log("files: " + files);
      });
  };

  const handleUploadBtnClick = async () => {
    console.log("file links", fileLinks);
    setIsLoadingFile(true);
    const url = config["PARSER_URL"] + "/server/gwlogparser/json";
    const data = { links: [] };
    const headers = { "Content-Type": "application/json" };
    fileLinks.forEach((link) => {
      let linkurl = link.split("t/")[1].split("_")[0];
      data.links.push({ href: `https://dps.report/getJson?id=${linkurl}` });
    });
    console.log("data: " + JSON.stringify(data));
    fetch(url, {
      method: "POST",
      mode: "cors",
      headers: headers,
      body: JSON.stringify(data),
    })
      .then((response) => console.log(response.status) || response)
      .then((response) => {
        console.log(response);
        if (response.status === 202) {
          console.log("202 sending response");
          return response.json();
        }
      })
      .then((response) => {
        console.log("uploadclick getting celery link", response);
        setFileLocation(response["Location"]);
      });
    // console.log(JSON.stringify(response.json()));
  };

  useEffect(
    () => () => {
      console.log("filelocation before", fileLocation);
    },
    [fileLocation]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
  });

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isDragActive ? activeStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {}),
    }),
    [isDragActive, isDragReject, isDragAccept]
  );

  const thumbs = files.map((file) => (
    <div
      key={file.name}
      className="upload-thumb"
    >
      <img
        src={file.preview}
        alt={file.name}
      />
    </div>
  ));

  const thumbsLinks = fileLinks.map((file) => (
    <div
      key={file + Math.floor(Math.random() * 100)}
      className="upload-thumb"
    >
      <a
        href={file}
        target="_blank"
        rel="noopener noreferrer"
      >
        {file}
      </a>
    </div>
  ));

  const ParsedInfo = () => {
    if (!parsedFile) return "no file";
    const stats = parsedFile["overall_raid_stats"];
    return (
      <div>
        <div className="parsedInfoRow">Date: {stats.date}</div>
        <div className="parsedInfoRow">Max Allies: {stats.max_allies}</div>
        <div className="parsedInfoRow">Max Enemies: {stats.max_enemies}</div>
        <div className="parsedInfoRow">Kills: {stats.total_kills}</div>
      </div>
    );
  };

  return (
    <section>
      <div {...getRootProps({ style })}>
        <input {...getInputProps()} />
        <div className="dropzone-text">Drag and drop your files here.</div>
      </div>
      <div className="resultContainer">
        <aside className="resultColumn">
          <h2>Files</h2>
          {thumbs}
        </aside>
        <aside className="resultColumn">
          <h2>Links</h2>
          {thumbsLinks}
          {isLoadingLinks && <Circles />}
        </aside>
      </div>
      <div className="parsedContainer">
        <div className="parsedInfo">
          {isLoadingFile && <Circles />}
          <ParsedInfo />
        </div>
        <div className="parsedLink">
          {" "}
          {parsedFile && (
            <a
              href={`data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(parsedFile)
              )}`}
              download={`${parsedFile["overall_raid_stats"]["date"]}_wvw_log.json`}
            >
              {`Download Json`}
            </a>
          )}
        </div>
      </div>

      <button
        className="parseBtn"
        onClick={handleUploadBtnClick}
      >
        Parse logs
      </button>
    </section>
  );
}

export default DropzoneComponent;
