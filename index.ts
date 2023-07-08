export const getFiles = (event: DragEvent) => {
  event.preventDefault();
  const files = event.dataTransfer?.items;
  if (files) {
    return getFileList(files);
  } else {
    return [];
  }
};
const getFileList = (files: DataTransferItemList, config?: FileConfig): Promise<DragDropPromise> => {
  let size: number = 0;
  const fileList: File[] = [];// prettier-ignore
  const dirPromises: Promise<any>[] = []; // prettier-ignore
  const filePromises: Promise<any>[] = []; // prettier-ignore
  let sizeExceeded: boolean = false;
  const processFile = (entry: any) => {
    const pr: Promise<any> = new Promise((fileResolve, fileReject) => {
      entry.file((f: File) => {
        size += f.size;
        if (config?.maxFileSize) {
          if (f.size > config.maxFileSize) {
            if (config.rejectOnMaxFileSize) {
              sizeExceeded = true;
              fileReject('file_size_exceeded');
            }
          } else {
            fileResolve(f);
          }
        }
        if (config?.maxUploadSize) {
          if (size > config.maxUploadSize) {
            if (config.rejectOnMaxUploadSize) {
              sizeExceeded = true;
              fileReject('upload_size_exceeded');
            } else {
              fileResolve(f);
            }
          }
        }
        fileResolve(f);
      });
    });
    pr.then((f: File) => {
      fileList.push(f);
    });
    if (!sizeExceeded) {
      filePromises.push(pr);
    }
  };
  const checkDir = (f: any) => {
    return new Promise((mainResolve, mainReject) => {
      const reader = f.createReader();
      const innerPromises: Promise<any>[] = [];
      const readEntries = () => {
        reader.readEntries((entries: any) => {
          if (entries.length > 0) {
            for (const entry of entries) {
              if (sizeExceeded) {
                break;
              }
              if (entry.isFile) {
                processFile(entry);
              } else if (entry.isDirectory) {
                innerPromises.push(checkDir(entry));
              }
            }
            if (!sizeExceeded) {
              readEntries();
            }
          } else {
            Promise.all(innerPromises).then(
              () => {
                mainResolve('');
              },
              (error) => {
                mainReject(error);
              },
            );
          }
        });
      };
      if (!sizeExceeded) {
        readEntries();
      }
    });
  };
  for (const element of files) {
    const f: FileSystemEntry | null = element.webkitGetAsEntry();
    if (f) {
      if (f.isDirectory) {
        dirPromises.push(checkDir(f));
      } else if (f.isFile) {
        processFile(f);
      }
    }
  }
  return new Promise((res, rej) => {
    Promise.all(dirPromises).then(
      () => {
        Promise.all(filePromises).then(
          () => {
            res({
              error: null,
              filesList: fileList,
              total_size: size,
            });
          },
          (err) => {
            rej({
              error: err,
              filesList: fileList,
              total_size: size,
            });
          },
        );
      },
      (err) => {
        rej({
          error: err,
          filesList: fileList,
          total_size: size,
        });
      },
    );
  });
};

export interface UploadFile {
  file: File;
  size: number;
  name: string;
  folder_name: string;
}

export interface FileConfig {
  maxFileSize?: number;
  maxUploadSize?: number;
  rejectOnMaxFileSize?: boolean;
  rejectOnMaxUploadSize?: boolean;
}

export interface DragDropPromise {
  error: any;
  filesList: File[];
  total_size: number;
}
