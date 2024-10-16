import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    
    const timeStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    timeStatusBarItem.command = 'extension.showTime';
    timeStatusBarItem.tooltip = 'Click to show the current system time';
    timeStatusBarItem.show();

    let DeadlineDate: Date | null = loadDeadlineDate(context);

    const imagePath = path.join(context.extensionPath, 'images', 'kot mem.jpg');

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
                vscode.window.showInformationMessage("Deadline will occur in 1 hour!");
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

                timeStatusBarItem.text = `$(clock) ${currentTimeString} | ${timeUntilDeadline} until Deadline`;

                checkDeadlineNotification();
            } else {
                timeStatusBarItem.text = `$(check) Deadline has occurred!`;

                vscode.commands.executeCommand('extension.showImage');
                removeDeadlineDate(context);
            }
        } else {
            timeStatusBarItem.text = `$(alert) Set an Deadline date and time`;
        }
    };

    setInterval(updateTime, 1000);

    let disposableShowTime = vscode.commands.registerCommand('extension.showTime', () => {
        const currentTime = new Date().toLocaleTimeString();
        vscode.window.showInformationMessage(`Current system time is: ${currentTime}`);
    });

    let disposableSetDeadline = vscode.commands.registerCommand('extension.setDeadline', async () => {
        const input = await vscode.window.showInputBox({
            placeHolder: 'Enter the Deadline date (DD-MM HH:mm)',
            validateInput: (value: string) => {
                const regex = /^\d{2}-\d{2} \d{2}:\d{2}$/;
                if (!regex.test(value)) {
                    return 'Invalid format. Please use DD-MM HH:mm';
                }
                return null;
            }
        });

        if (input) {
            const currentYear = new Date().getFullYear();
            const [data, time] = input.split(' ');
            const [day, month] = data.split('-');
            const [hour, minute] = time.split(':');

            const DeadlineString = `${currentYear}-${month}-${day}T${hour}:${minute}:59`;

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

    context.subscriptions.push(disposableShowTime);
    context.subscriptions.push(disposableSetDeadline);

    let disposableShowImage = vscode.commands.registerCommand('extension.showImage', () => {
        const panel = vscode.window.createWebviewPanel(
            'DeadlineImage',
            'Deadline Image',
            vscode.ViewColumn.One,
            {}
        );

        const imageUri = panel.webview.asWebviewUri(vscode.Uri.file(imagePath));
        panel.webview.html = `<html><body><img src="${imageUri}" style="max-width:100%;max-height:100%"></body></html>`;

        removeDeadlineDate(context);
    });

    context.subscriptions.push(disposableShowImage);

    function removeDeadlineDate(context: vscode.ExtensionContext) {
        DeadlineDate = null;
        context.globalState.update('DeadlineDate', null);
    }

    function saveDeadlineDate(context: vscode.ExtensionContext, DeadlineDate: Date) {
        context.globalState.update('DeadlineDate', DeadlineDate.toISOString());
    }

    function loadDeadlineDate(context: vscode.ExtensionContext): Date | null {
        const savedDate = context.globalState.get<string>('DeadlineDate');
        return savedDate ? new Date(savedDate) : null;
    }
}

export function deactivate() {}