import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    const timeStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    let DeadlineDate: Date | null = loadDeadlineDate(context);
    let userImagePath = loadImagePath(context);
    let videoPath = loadVideoPath(context);
    const defaultImagePath = path.join(context.extensionPath, 'images', 'kot mem.jpg');

    if (DeadlineDate) {
        timeStatusBarItem.command = 'extension.showTime';
        timeStatusBarItem.tooltip = 'Click to show the current system time';
    } else {
        timeStatusBarItem.command = 'extension.setDeadline';
        timeStatusBarItem.tooltip = 'Click to set the Deadline';
    }
    timeStatusBarItem.show();

    const formatTime = (time: number): string => {
        return time < 10 ? `0${time}` : time.toString();
    };

    const checkDeadlineNotification = () => {
        if (DeadlineDate) {
            const currentTime = new Date();
            const timeDifference = DeadlineDate.getTime() - currentTime.getTime();

            if (timeDifference <= 10 * 60 * 60 * 1000 && timeDifference > 9 * 60 * 60 * 1000) {    
                vscode.window.showInformationMessage("Deadline will occur in 10 hours!");
            } else if (timeDifference <= 60 * 60 * 1000 && timeDifference > 59 * 60 * 1000) {    
                vscode.window.showInformationMessage("Deadline will occur in 1 hour O.o");
            }
        }
    };

    const updateTime = () => {
        const currentTime = new Date();
        const currentTimeString = currentTime.toLocaleTimeString();

        if (DeadlineDate) {
            const timeDifference = DeadlineDate.getTime() - currentTime.getTime();
            if (timeDifference > 0) {
                const daysLeft = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
                const secondsLeft = Math.floor((timeDifference % (1000 * 60)) / 1000);

                const timeUntilDeadline = `${daysLeft}d ${formatTime(hoursLeft)}:${formatTime(minutesLeft)}:${formatTime(secondsLeft)}`;

                timeStatusBarItem.text = `$(clock) ${currentTimeString} || ${timeUntilDeadline} until Deadline`;

                checkDeadlineNotification();
            } else {
                timeStatusBarItem.text = `$(check) Deadline is over :(`;
                vscode.commands.executeCommand('extension.showMedia');
                removeDeadlineDate(context);
            }
        } else {
            timeStatusBarItem.text = `$(alert) Click to set a new Deadline`;
        }
    };

    setInterval(updateTime, 1000);

    const disposableSetDeadline = vscode.commands.registerCommand('extension.setDeadline', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: 'Enter the Deadline (DD-MM HH:mm:ss)',
            validateInput: (value: string) => {
                const regex = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
                if (!regex.test(value)) {
                    return 'Invalid format. Please use DD-MM HH:mm:ss';
                }
                return null;
            }
        });

        if (input) {
            const currentYear = new Date().getFullYear();
            const [data, time] = input.split(' ');
            const [day, month] = data.split('-');
            const [hour, minute, seconds] = time.split(':');

            const DeadlineString = `${currentYear}-${month}-${day}T${hour}:${minute}:${seconds}`;
            const parsedDate = new Date(DeadlineString);
            if (!isNaN(parsedDate.getTime())) {
                DeadlineDate = parsedDate;
                saveDeadlineDate(context, DeadlineDate);
                vscode.window.showInformationMessage(`Deadline date set to: ${DeadlineDate.toLocaleString()}`);
            } else {
                vscode.window.showErrorMessage('Invalid date/time input!');
            }
        }
    });

    const disposableShowTime = vscode.commands.registerCommand('extension.showTime', () => {
        const currentTime = new Date().toLocaleTimeString();
        vscode.window.showInformationMessage(`Current system time is: ${currentTime}`);
    });

    const disposableSetImagePath = vscode.commands.registerCommand('extension.setImagePath', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: 'Enter the full path to the image file',
        });

        if (input && fs.existsSync(input)) {
            try {
                const imageName = path.basename(input);
                const targetPath = path.join(context.extensionPath, 'images', imageName);

                fs.copyFileSync(input, targetPath);

                userImagePath = targetPath;
                saveImagePath(context, userImagePath);

                vscode.window.showInformationMessage(`Image path set to: ${userImagePath}`);
            } catch (err) {
                vscode.window.showErrorMessage('Failed to copy the image. Please try again.');
            }
        } else {
            vscode.window.showErrorMessage('Invalid file path or file does not exist.');
        }
    });

    const disposableRemoveImagePath = vscode.commands.registerCommand('extension.removeImagePath', () => {
        if (userImagePath && fs.existsSync(userImagePath)) {
            fs.unlinkSync(userImagePath);
        }
        userImagePath = null;
        removeImagePath(context);
        vscode.window.showInformationMessage("User-defined image path removed. Default image will be used.");
    });

    const disposableSetVideoPath = vscode.commands.registerCommand('extension.setVideoPath', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: 'Enter the full path to the video file',
        });

        if (input && fs.existsSync(input)) {
            try {
                const videoName = path.basename(input);
                const targetPath = path.join(context.extensionPath, 'videos', videoName);

                fs.copyFileSync(input, targetPath);

                videoPath = targetPath;
                saveVideoPath(context, videoPath);

                vscode.window.showInformationMessage(`Video path set to: ${videoPath}`);
            } catch (err) {
                vscode.window.showErrorMessage('Failed to copy the video. Please try again.');
            }
        } else {
            vscode.window.showErrorMessage('Invalid file path or file does not exist.');
        }
    });

    const disposableRemoveVideoPath = vscode.commands.registerCommand('extension.removeVideoPath', () => {
        if (videoPath && fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }
        videoPath = null;
        removeVideoPath(context);
        vscode.window.showInformationMessage("User-defined video path removed.");
    });

    const disposableShowMedia = vscode.commands.registerCommand('extension.showMedia', () => {
        const panel = vscode.window.createWebviewPanel(
            'DeadlineMedia',
            'Deadline Media',
            vscode.ViewColumn.One,
            {}
        );

        if (videoPath && fs.existsSync(videoPath)) {
            const videoUri = panel.webview.asWebviewUri(vscode.Uri.file(videoPath));
            panel.webview.html = `
                <html>
                <body>
                    <video controls autoplay style="max-width:100%;max-height:100%">
                        <source src="${videoUri}">
                        Your browser does not support the video tag.
                    </video>
                </body>
                </html>`;
        } else {
            const imagePathToShow = userImagePath || defaultImagePath;
            const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(imagePathToShow));
            panel.webview.html = `<html><body><img src="${imageUri}" style="max-width:100%;max-height:100%"></body></html>`;
        }
    });

    context.subscriptions.push(
        disposableSetDeadline,
        disposableShowTime,
        disposableSetImagePath,
        disposableRemoveImagePath,
        disposableSetVideoPath,
        disposableRemoveVideoPath,
        disposableShowMedia
    );

    function saveDeadlineDate(context: vscode.ExtensionContext, date: Date) {
        context.globalState.update('DeadlineDate', date.toISOString());
    }

    function loadDeadlineDate(context: vscode.ExtensionContext): Date | null {
        const savedDate = context.globalState.get<string>('DeadlineDate');
        return savedDate ? new Date(savedDate) : null;
    }

    function removeDeadlineDate(context: vscode.ExtensionContext) {
        context.globalState.update('DeadlineDate', null);
    }

    function saveImagePath(context: vscode.ExtensionContext, path: string) {
        context.globalState.update('ImagePath', path);
    }

    function loadImagePath(context: vscode.ExtensionContext): string | null {
        return context.globalState.get<string>('ImagePath') || null;
    }

    function removeImagePath(context: vscode.ExtensionContext) {
        context.globalState.update('ImagePath', null);
    }

    function saveVideoPath(context: vscode.ExtensionContext, path: string) {
        context.globalState.update('VideoPath', path);
    }

    function loadVideoPath(context: vscode.ExtensionContext): string | null {
        return context.globalState.get<string>('VideoPath') || null;
    }

    function removeVideoPath(context: vscode.ExtensionContext) {
        context.globalState.update('VideoPath', null);
    }
}

export function deactivate() {}
