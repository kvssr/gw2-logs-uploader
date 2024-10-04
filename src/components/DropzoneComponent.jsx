import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import config from "./../config.json";
import Oval from "react-loading-icons/dist/esm/components/oval";

const baseStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px",
  borderWidth: 2,
  borderRadius: 2,
  borderStyle: "dashed",
  transition: "border .3s ease-in-out",
  marginBottom: 20,
};

const circleColour = {
  a: "#03ca00",
  b: "#ffa421",
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
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [databaseId, setDatabaseId] = useState("");
  let fetchInterval = useRef();

  console.log("🚀 ~ DropzoneComponent ~ files:", files);
  console.log("Parsed file: " + parsedFile);
  console.log("File location: " + fileLocation);

  const onDrop = useCallback((acceptedFiles) => {
    setFilelinks([]);
    setDatabaseId("");
    let filesTemp = {};
    acceptedFiles.map((file) => {
      let name = file.name.split(".")[0];
      filesTemp[name] = {
        file: file,
        status: "waiting",
        link: "",
      };
      setFiles({ ...filesTemp });
      return file;
    });
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
    for (let key in files) {
      if (files[key]["status"] === "waiting") {
        files[key]["server"] = "a";
        uploadFile(files[key]["file"], key);
        files[key]["status"] = "loading";
        setFiles({ ...files });
      } else if (files[key]["status"] === "failed") {
        if (files[key]["server"] === "b") return;
        files[key]["server"] = "b";
        uploadFile(files[key]["file"], key, "b.");
        files[key]["status"] = "loading";
        setFiles({ ...files });
      }
    }
  }, [files]);

  const uploadFile = (file, name, url = "") => {
    let formData = new FormData();
    formData.append("file", file);
    console.log("uploadFile file: ", files[name]);

    var myHeaders = new Headers();
    myHeaders.append("Pragma", "no-cache");
    myHeaders.append("Cache-Control", "no-cache");
    myHeaders.append("Connection", "keep-alive");
    myHeaders.append("Sec-Fetch-Dest", "empty");
    myHeaders.append("Sec-Fetch-Mode", "corse");
    myHeaders.append("Sec-Fetch-Site", "same-site");

    fetch(`https://${url}dps.report/uploadContent?json=1&detailedwvw=true`, {
      method: "POST",
      body: formData,
      timeout: 10 * 60 * 1000,
      headers: myHeaders,
    })
      .then((response) => console.log(response.status) || response)
      .then((response) => {
        if (response.status === 200) {
          console.log("200 sending response");
          console.log(response);
          return response.json();
        }
        if (response.status > 500) {
          throw new Error("Timeout ");
        }
        console.log("Diff response: " + response.status);
      })
      .then((response) => {
        // let data = response.json();
        console.log("Last then");
        console.log(response);
        console.log("Name: " + name);
        console.log("Files: ", files);
        files[name]["link"] = response["permalink"];
        files[name]["status"] = "loaded";
        setFilelinks((fileLinks) => [...fileLinks, response["permalink"]]);
        console.log("files: " + files);
      })
      .catch((error) => {
        console.log("Catch error", error);
        updateLinkStatus(name, `failed`);
      });
  };

  const updateLinkStatus = (name, status) => {
    files[name]["status"] = status;
    setFiles({ ...files });
  };

  const handleUploadBtnClick = () => {
    let file = addLinksToParsedFile();
    setDatabaseId("loading");
    const headers = { "Content-Type": "application/json" };
    const url = config["SERVER_URL"];
    fetch(url + "/record/", {
      method: "POST",
      mode: "cors",
      headers: headers,
      body: JSON.stringify(file),
    })
      .then((response) => console.log(response.status) || response)
      .then((response) => {
        console.log(response);
        if (response.status === 200) {
          console.log("200 receiving response");
          return response.json();
        }
      })
      .then((response) => {
        console.log("Getting response file", response);
        setDatabaseId(response.insertedId);
      });
  };

  const addLinksToParsedFile = () => {
    let sortedFiles = Object.keys(files).sort();
    console.log("🚀 ~ addLinksToParsedFile ~ sortedFiles:", sortedFiles);

    let fights = parsedFile["fights"];
    fights.forEach((fight, i) => {
      fight["permalink"] = files[Object.keys(files)[i]]["link"];
    });

    return parsedFile;
  };

  const handleParseBtnClick = async () => {
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

  const Thumbs = () => {
    let filenames = [];
    for (let key in files) {
      filenames.push(key);
    }
    return filenames.map((file) => (
      <div
        key={file.name}
        className="upload-thumb"
      >
        <div className="uploadThumbCell">{file}</div>
        <div className="uploadThumbCell">
          {files[file]["status"] === "loading" ? (
            <Oval
              width={20}
              height={20}
              marginLeft={20}
              stroke={circleColour[files[file]["server"]]}
            />
          ) : (
            <a
              href={files[file]["link"]}
              target="_blank"
              rel="noopener noreferrer"
            >
              {files[file]["link"]}
            </a>
          )}
          {files[file]["status"] === "failed" &&
            files[file]["server"] === "b" && <div>File is too big.</div>}
        </div>
      </div>
    ));
  };

  const ThumbsLinks = () => {
    let filelinks = [];
    for (let key in files) {
      if (files[key]["status"] === "loading") filelinks.push("loading");
      else if (files[key]["status"] === "failed") filelinks.push("failed");
      else filelinks.push(key);
    }
    return filelinks.map((file) => {
      if (file === "loading") {
        return "";
      } else if (file === "failed") {
        return <div>Failed...</div>;
      } else {
        return (
          <div
            key={file + Math.floor(Math.random() * 100)}
            className="upload-thumb"
          >
            {" "}
            <a
              href={files[file]["link"]}
              target="_blank"
              rel="noopener noreferrer"
            >
              {files[file]["link"]}
            </a>
          </div>
        );
      }
    });
  };

  const ParsedInfo = () => {
    if (!parsedFile) return "";
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

  const DatabaseInfo = () => {
    return (
      <div>
        <p>ID: {databaseId}</p>
        <p>
          Link:{" "}
          <a
            href={`https://kvssr.github.io/gw2log-viewer-client/#/${databaseId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            gw2log-viewer-client
          </a>
        </p>
      </div>
    );
  };

  return (
    <section>
      <div
        {...getRootProps({ style })}
        className="dropzone"
      >
        <input {...getInputProps()} />
        <div className="dropzone-text">Drag and drop your files here.</div>
      </div>
      <div className="resultContainer">
        <aside className="resultColumn">
          <h2>Files</h2>
          <Thumbs />
        </aside>
        {/* <aside className="resultColumn">
          <h2>Links</h2>
          <ThumbsLinks />
        </aside> */}
      </div>
      <div className="parsedContainer">
        <div className="postParsedRow">
          <div className="parsedInfo">
            {isLoadingFile && (
              <Oval
                width={20}
                height={20}
              />
            )}
            <ParsedInfo />

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
          <div className="dbContainer">
            {databaseId === "loading" && (
              <Oval
                width={20}
                height={20}
              />
            )}
            {databaseId !== "loading" && databaseId !== "" && <DatabaseInfo />}
          </div>
        </div>
      </div>
      <div className="btnContainer">
        <button
          className="parseBtn btn"
          onClick={handleParseBtnClick}
        >
          Parse logs
        </button>

        <button
          className="uploadBtn btn"
          onClick={handleUploadBtnClick}
          disabled={!parsedFile}
        >
          Upload Log
        </button>
      </div>
    </section>
  );
}

export default DropzoneComponent;
